import { NextFunction, Request, Response } from 'express';
import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
};

type GalleryPhoto = {
  id: string;
  name: string;
  alt: string;
  local: boolean;
};

const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_FILE =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_FILE;

const LOCAL_GALLERY_DIR = path.join(__dirname, '..', '..', 'public', 'gallery');

// Cache de fotos locais
let localPhotosCache: GalleryPhoto[] | null = null;

function getLocalPhotos(): GalleryPhoto[] {
  if (localPhotosCache) return localPhotosCache;

  try {
    if (!fs.existsSync(LOCAL_GALLERY_DIR)) {
      localPhotosCache = [];
      return [];
    }

    const files = fs.readdirSync(LOCAL_GALLERY_DIR);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.jfif', '.gif'];

    localPhotosCache = files
      .filter((f) => imageExtensions.includes(path.extname(f).toLowerCase()))
      .filter((f) => f !== 'index.ts') // ignore the index.ts file if copied
      .map((f, idx) => ({
        id: `local-${idx}`,
        name: f.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        alt: f.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        local: true,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return localPhotosCache;
  } catch {
    return [];
  }
}

// --- Singleton do Google Drive Client ---
let driveClient: drive_v3.Drive | null = null;
let driveClientPromise: Promise<drive_v3.Drive> | null = null;

const getDriveClient = async (): Promise<drive_v3.Drive> => {
  if (driveClient) return driveClient;

  if (!driveClientPromise) {
    driveClientPromise = (async () => {
      const auth = new google.auth.GoogleAuth({
        keyFile: GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });

      const client = google.drive({ version: 'v3', auth });

      // Pré-aquecer o token
      await auth.getClient();

      return client;
    })();
  }

  try {
    driveClient = await driveClientPromise;
    return driveClient;
  } catch (error) {
    // Se falhou (ex: OAuth intermitente), limpa a promise para
    // que a próxima chamada tente novamente do zero
    driveClientPromise = null;
    throw error;
  }
};

// --- Handlers ---

export const listarFotosGaleria = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Tenta Google Drive primeiro
    if (GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_FILE) {
      try {
        const drive = await getDriveClient();

        const response = await drive.files.list({
          q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`,
          fields: 'files(id,name,mimeType)',
          pageSize: 100,
          orderBy: 'name',
        });

        const data = response.data as { files?: GoogleDriveFile[] };

        if (data.files && data.files.length > 0) {
          const photos: GalleryPhoto[] = data.files.map((file) => ({
            id: file.id,
            name: file.name,
            alt:
              file.name
                .replace(/[-_]/g, ' ')
                .replace(/\.[^.]+$/, '') || 'Foto da galeria',
            local: false,
          }));

          return res.json({ photos, source: 'google-drive' });
        }

        // Google Drive retornou vazio — fallback pra local
        console.log('Google Drive vazio, usando fallback local');
      } catch (driveError) {
        console.error('Erro ao acessar Google Drive, usando fallback local:', driveError);
      }
    }

    // Fallback: galeria local
    const localPhotos = getLocalPhotos();

    if (localPhotos.length === 0) {
      return res.json({ photos: [], source: 'local', message: 'Nenhuma imagem disponível na galeria local.' });
    }

    return res.json({ photos: localPhotos, source: 'local' });
  } catch (error) {
    return next(error);
  }
};

export const servirImagemGaleria = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const fileId = Array.isArray(req.params.fileId)
      ? req.params.fileId[0]
      : req.params.fileId;

    if (!fileId) {
      return res.status(400).json({ message: 'Informe o id da imagem.' });
    }

    // Imagem local (prefixed with "local-")
    if (fileId.startsWith('local-')) {
      const idx = parseInt(fileId.replace('local-', ''), 10);
      const photos = getLocalPhotos();

      if (isNaN(idx) || idx < 0 || idx >= photos.length) {
        return res.status(404).json({ message: 'Imagem não encontrada.' });
      }

      const photoName = photos[idx].name;
      const galleryDir = LOCAL_GALLERY_DIR;

      // Procurar o arquivo correspondente
      const files = fs.readdirSync(galleryDir);
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.jfif', '.gif'];

      const matchedFile = files.find((f) => {
        const base = path.parse(f).name.replace(/[-_]/g, ' ');
        return base === photoName && imageExtensions.includes(path.extname(f).toLowerCase());
      });

      if (!matchedFile) {
        return res.status(404).json({ message: 'Arquivo de imagem não encontrado.' });
      }

      const filePath = path.join(galleryDir, matchedFile);
      const ext = path.extname(matchedFile).toLowerCase();

      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.avif': 'image/avif',
        '.jfif': 'image/jpeg',
        '.gif': 'image/gif',
      };

      res.setHeader('Content-Type', mimeMap[ext] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(filePath);
    }

    // Google Drive
    if (!GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_FILE) {
      return res.status(500).json({
        message: 'Google Drive não configurado e imagem não é local.',
      });
    }

    const drive = await getDriveClient();

    const metadata = (
      await drive.files.get({
        fileId,
        fields: 'id,name,mimeType',
      })
    ) as unknown as { data: { mimeType?: string } };

    const contentType = metadata.data.mimeType || 'image/jpeg';

    const fileResponse = (await drive.files.get(
      {
        fileId,
        alt: 'media',
      },
      { responseType: 'stream' },
    )) as unknown as { data: Readable };

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const stream = fileResponse.data as Readable;
    stream.on('error', (err) => {
      console.error('Erro no stream da imagem:', err);
      if (!res.headersSent) {
        return next(err);
      }
      res.end();
    });
    stream.pipe(res);
  } catch (error: any) {
    if (error?.code === 404) {
      return res.status(404).json({ message: 'Imagem não encontrada.' });
    }
    return next(error);
  }
};
