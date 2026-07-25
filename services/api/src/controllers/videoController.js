const videoService = require('../services/videoService');

async function requestUploadUrl(req, res, next) {
  try {
    const result = await videoService.requestUploadUrl(req.user.id, req.body.filename);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function confirmUpload(req, res, next) {
  try {
    const video = await videoService.confirmUpload(req.user.id, req.params.id, req.user.email);
    res.json({ video });
  } catch (err) {
    next(err);
  }
}

async function listVideos(req, res, next) {
  try {
    const videos = await videoService.listVideos(req.user.id);
    res.json({ videos });
  } catch (err) {
    next(err);
  }
}

async function getVideo(req, res, next) {
  try {
    const video = await videoService.getVideo(req.user.id, req.params.id);
    res.json({ video });
  } catch (err) {
    next(err);
  }
}

async function getDownloadUrl(req, res, next) {
  try {
    const result = await videoService.getDownloadUrl(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { requestUploadUrl, confirmUpload, listVideos, getVideo, getDownloadUrl };
