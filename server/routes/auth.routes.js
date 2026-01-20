const router = require("express").Router();
const ctrl = require("../controllers/auth.controller");
const isAuth = require("../middlewares/isAuth");

/* ===== ADMIN LOGIN (PUBLIC) ===== */
router.post("/login", ctrl.login);

/* ===== VERIFY TOKEN (PROTECTED) ===== */
router.get("/verify", isAuth(["ADMIN", "CANDIDATE"]), (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
