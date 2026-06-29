const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const playerPhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'sports-platform/players',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
  },
});

const teamLogoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'sports-platform/teams',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    transformation: [{ width: 200, height: 200, crop: 'fit' }],
  },
});

const sportLogoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'sports-platform/sports',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
  },
});

const uploadPlayerPhoto = multer({ storage: playerPhotoStorage });
const uploadTeamLogo    = multer({ storage: teamLogoStorage });
const uploadSportLogo   = multer({ storage: sportLogoStorage });

module.exports = { cloudinary, uploadPlayerPhoto, uploadTeamLogo, uploadSportLogo };
