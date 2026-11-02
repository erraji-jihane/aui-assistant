import "multer";

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}
