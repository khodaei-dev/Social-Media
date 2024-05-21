const postModel = require("./../../model/post");
const likeModel = require("./../../model/like");
const saveModel = require("./../../model/save");
const { postCreateValidator } = require("./post.validator");
const hasAccessTopage = require("./../../utils/hasAccessToPage");
const { getUserInfo } = require("../../utils/helper");
const path = require("path");
const fs = require("fs");

exports.showPostUploaderViews = async (req, res) => {
  return res.render("posts/upload");
};

exports.createPost = async (req, res, next) => {
  try {
    const { description, hashtags } = req.body;
    const user = req.user;
    const tags = hashtags.split(",");

    if (!req.file) {
      req.flash("error", "media is a required");
      return res.render("posts/upload");
    }

    await postCreateValidator.validate({ description }, { abortEarly: false });
    const mediaUrlPath = `/images/posts/${req.file.filename}`;

    const post = await postModel.create({
      media: {
        path: mediaUrlPath,
        filename: req.file.filename,
      },
      description,
      user: user._id,
      hashtags: tags,
    });

    req.flash("success", "Post created successfully");
    return res.redirect("/posts");
  } catch (err) {
    next(err);
  }
};

exports.likePost = async (req, res, next) => {
  try {
    const user = req.user;
    const { postId } = req.body;

    const post = await postModel.findOne({ _id: postId });
    if (!post) {
      req.flash("error", "Post Not Found");
      return res.redirect("back");
    }

    const hasAccess = hasAccessTopage(user._id, post.user.toString());
    if (!hasAccess) {
      req.flash("error", "Page Private Please Follow First");
      return res.redirect("back");
    }

    const isExistLike = await likeModel.findOne({
      post: postId,
      user: user._id,
    });
    if (isExistLike) {
      return res.redirect("back");
    }

    await likeModel.create({ post: postId, user: user._id });
    return res.redirect("back");
  } catch (err) {
    //
  }
};

exports.disLikePost = async (req, res, next) => {
  try {
    const user = req.user;
    const { postId } = req.body;

    const like = await likeModel.findOne({ user: user._id, post: postId });
    if (!like) {
      return res.redirect("back");
    }

    await likeModel.findOneAndDelete({ _id: like._id });
    return res.redirect("back");
  } catch (err) {
    next(err);
  }
};

exports.save = async (req, res, next) => {
  try {
    const user = req.user;
    const { postId } = req.body;

    const post = await postModel.findOne({ _id: postId });
    if (!post) {
      req.flash("error", "Post Not Found");
      return res.redirect("back");
    }

    const hasAccess = hasAccessTopage(user._id, post.user.toString());
    if (!hasAccess) {
      req.flash("error", "Page Private Please Follow First");
      return res.redirect("back");
    }

    const isExistSave = await saveModel.findOne({
      post: postId,
      user: user._id,
    });
    if (isExistSave) {
      return res.redirect("back");
    }

    await saveModel.create({ post: postId, user: user._id });
    return res.redirect("back");
  } catch (err) {
    next(err);
  }
};

exports.unSave = async (req, res, next) => {
  try {
    const user = req.user;
    const { postId } = req.body;

    const save = await saveModel.findOne({ user: user._id, post: postId });
    if (!save) {
      return res.redirect("back");
    }

    await saveModel.findOneAndDelete({ _id: save._id });
    return res.redirect("back");
  } catch (err) {
    next(err);
  }
};

exports.showSaveViews = async (req, res, next) => {
  try {
    const user = req.user;

    const saves = await saveModel
      .find({ user: user._id })
      .populate({
        path: "post",
        populate: {
          path: "user",
          model: "Users",
        },
      })
      .sort({ _id: -1 });
    const likes = await likeModel.find({ user: user._id }).populate("post");

    saves.forEach((item) => {
      if (likes.length) {
        likes.forEach((like) => {
          if (like.post._id.toString() === item.post._id.toString()) {
            item.post.isLiked = true;
          }
        });
      }
    });

    const userInfo = await getUserInfo(user._id);

    return res.render("posts/saves", {
      saves,
      user: userInfo,
    });
  } catch (err) {
    next(err);
  }
};

exports.removePost = async (req, res, next) => {
  try {
    const user = req.user;
    const { postId } = req.params;

    const post = await postModel.findOne({ _id: postId });
    if (!post || post.user.toString() !== user._id.toString()) {
      req.flash("error", "you cant remove this Post");
      return res.redirect("back");
    }

    const mediaPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "public",
      "images",
      "posts",
      post.media.filename
    );

    fs.unlinkSync(mediaPath, (err) => {
      if (err) {
        next(err);
      }
    });

    const like = await likeModel.deleteMany({ _id: postId });
    const save = await saveModel.deleteMany({ _id: postId });
    // const comment = await commentModel.deleteMany({ _id: postId });

    const remove = await postModel.findByIdAndDelete(postId);

    req.flash("success", "Post Removed Successfully");
    return res.redirect("back");
  } catch (err) {
    next(err);
  }
};
