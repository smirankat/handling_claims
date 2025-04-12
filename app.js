require("dotenv").config();
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const express = require("express");
const hbs = require("hbs");

const app = express();
const urlencodedParser = express.urlencoded({ extended: false });
const PORT = process.env.PORT || 5000;

// определяем объект Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    dialect: "postgres",
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
  }
);

// определяем модель Claim
const Claim = sequelize.define("claim", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  date: {
    type: Sequelize.DATEONLY,
    allowNull: false,
  },
  subject: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  text: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  status: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  comment: {
    type: Sequelize.STRING,
  },
});

app.set("view engine", "hbs");

// синхронизация с бд, после успешной синхронизации запускаем сервер
sequelize
  .sync()
  .then(() => {
    app.listen(PORT, function () {
      console.log(`Server started on port ${PORT}`);
    });
  })
  .catch((err) => console.log(err));

// получение обращений
app.get("/", function (req, res) {
  Claim.findAll({
    order: [["createdAt", "DESC"]],
    raw: true,
  })
    .then((data) => {
      res.render("index.hbs", {
        claims: data,
      });
    })
    .catch((err) => console.log(err));
});

// фильтрация по дате
app.post("/date", urlencodedParser, function (req, res) {
  let startDate = req.body.start;
  let endDate = req.body.end;
  if (req.body.start && !endDate) {
    endDate = startDate;
  }
  if (!req.body.start && endDate) {
    startDate = endDate;
  }
  if (!req.body.start && !endDate) {
    res.redirect("/");
  }
  Claim.findAll({
    order: [["createdAt", "DESC"]],
    raw: true,
    where: {
      date: {
        [Op.between]: [startDate, endDate],
      },
    },
  })
    .then((data) => {
      res.render("index.hbs", {
        claims: data,
      });
    })
    .catch((err) => console.log(err));
});

app.get("/create", function (req, res) {
  res.render("create.hbs");
});

// создание обращения
app.post("/create", urlencodedParser, function (req, res) {
  if (!req.body) return res.sendStatus(400);

  const claimDate = new Date();
  const claimSubject = req.body.subject;
  const claimText = req.body.text;
  const claimStatus = "Новое";
  Claim.create({
    date: claimDate,
    subject: claimSubject,
    text: claimText,
    status: claimStatus,
  })
    .then(() => {
      res.redirect("/");
    })
    .catch((err) => console.log(err));
});

// получаем объект по id для изменения статуса
app.get("/edit/:id", function (req, res) {
  const claimId = req.params.id;
  Claim.findAll({ where: { id: claimId }, raw: true })
    .then((data) => {
      res.render("edit.hbs", {
        claim: data[0],
      });
    })
    .catch((err) => console.log(err));
});

// изменение статуса
app.post("/edit", urlencodedParser, function (req, res) {
  if (!req.body) return res.sendStatus(400);

  const claimStatus = req.body.status;
  const claimId = req.body.id;
  Claim.update({ status: claimStatus, comment: "" }, { where: { id: claimId } })
    .then(() => {
      if (claimStatus === "Завершено" || claimStatus === "Отменено") {
        res.redirect("/comment/" + claimId);
      }

      res.redirect("/");
    })
    .catch((err) => console.log(err));
});

// получаем объект по id для добавления комментария
app.get("/comment/:id", function (req, res) {
  const claimId = req.params.id;
  Claim.findAll({ where: { id: claimId }, raw: true })
    .then((data) => {
      res.render("comment.hbs", {
        claim: data[0],
      });
    })
    .catch((err) => console.log(err));
});

// добавление комментария
app.post("/comment", urlencodedParser, function (req, res) {
  if (!req.body) return res.sendStatus(400);

  const commentText = req.body.comment;
  const claimId = req.body.id;
  Claim.update({ comment: commentText }, { where: { id: claimId } })
    .then(() => {
      res.redirect("/");
    })
    .catch((err) => console.log(err));
});

// удаление данных по id
app.post("/delete/:id", function (req, res) {
  const claimId = req.params.id;
  Claim.destroy({ where: { id: claimId } })
    .then(() => {
      res.redirect("/");
    })
    .catch((err) => console.log(err));
});

// отмена обращений со статусом "в работе"
app.post("/cancel", function (req, res) {
  Claim.update({ status: "Отменено" }, { where: { status: "В работе" } })
    .then(() => {
      res.redirect("/");
    })
    .catch((err) => console.log(err));
});
