import { NextFunction, Request, Response } from 'express';
import { google } from 'googleapis';
import { Readable } from 'stream';

type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
};

type GalleryPhoto = {
  id: string;
  name: string;
  alt: string;
};

const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_FILE;

const createDriveClient = async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
};

export const listarFotosGaleria = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_FILE) {
      return res.status(500).json({
        message: 'Configure GOOGLE_APPLICATION_CREDENTIALS no backend para carregar a galeria.',
      });
    }

    const drive = await createDriveClient();

    const response = await drive.files.list({
      q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id,name,mimeType)',
      pageSize: 100,
      orderBy: 'name',
    });

    const data = response.data as { files?: GoogleDriveFile[] };

    const photos: GalleryPhoto[] = (data.files ?? []).map((file) => ({
      id: file.id,
      name: file.name,
      alt: file.name.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '') || 'Foto da galeria',
    }));

    return res.json({ photos });
  } catch (error) {
    return next(error);
  }
};

export const servirImagemGaleria = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_FILE) {
      return res.status(500).json({
        message: 'Configure GOOGLE_APPLICATION_CREDENTIALS no backend para carregar a galeria.',
      });
    }

    const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;

    if (!fileId) {
      return res.status(400).json({ message: 'Informe o id da imagem.' });
    }

    const drive = await createDriveClient();
    const fileResponse = (await drive.files.get(
      {
        fileId,
        alt: 'media',
      },
      { responseType: 'stream' },
    )) as unknown as { data: Readable };

    const metadata = (await drive.files.get({
      fileId,
      fields: 'id,name,mimeType',
    })) as unknown as { data: { mimeType?: string } };

    const contentType = metadata.data.mimeType || 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const stream = fileResponse.data as Readable;
    stream.on('error', next);
    stream.pipe(res);
  } catch (error) {
    return next(error);
  }
};
