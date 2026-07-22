import { Router } from 'express';
import upload from '../config/upload.js';
import { verifyToken } from '../middleware/auth.js';
import { getAlbums, createAlbum, updateAlbum, deleteAlbum } from '../controllers/AlbumsController.js';
import { getAlbumPhotos, addAlbumPhotos, deleteAlbumPhoto } from '../controllers/PhotosController.js';

const router = Router();

router.get('/', getAlbums);
router.post('/', verifyToken, upload.single('cover'), createAlbum);
router.put('/:id', verifyToken, upload.single('cover'), updateAlbum);
router.delete('/:id', verifyToken, deleteAlbum);

router.get('/:albumId/photos', getAlbumPhotos);
router.post('/:albumId/photos', verifyToken, upload.array('photos', 30), addAlbumPhotos);
router.delete('/:albumId/photos/:photoId', verifyToken, deleteAlbumPhoto);

export default router;
