const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
app.use(express.json());
const path = require("path");
const dbPath = path.join(__dirname, "userData.db");
let db = null;
const bcrypt = require("bcrypt");

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("server listening at port: 3000");
    });
  } catch (e) {
    console.log(e.message);
    process.exitCode(1);
  }
};

initializeDBAndServer();

//api1 ** hasged password. check
app.post("/register", async (request, response) => {
  //console.log(request.body);
  const { username, name, password, gender, location } = request.body;
  //console.log(username, name, password, gender, location);
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
  select * from user
  where 
  username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  console.log(dbUser);
  if (dbUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    const lengthOfPassword = password.length;
    if (lengthOfPassword < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const addUserQuery = `
            INSERT INTO user(username, name, password, gender, location)
            VALUES (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            );`;
      const dbResponse = await db.run(addUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

//api2
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  //console.log(username, password);
  const dbUser = await db.get(
    `select * from user where username = '${username}';`
  );
  //login success, invalid password, invalid user
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === false) {
      response.status(400);
      response.send("Invalid password");
    } else {
      response.status(200);
      response.send("Login success!");
    }
  }
});

//api3 change password
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const dbUser = await db.get(
    `select * from user where username = '${username}'`
  );
  //compare with the password in db.
  if (dbUser === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const isPasswordMatches = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatches === false) {
      response.status(400);
      response.send("Invalid current password");
    } else {
      const newPasswordLength = newPassword.length;
      if (newPasswordLength < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const newPasswordHashed = await bcrypt.hash(newPassword, 10);
        const upDatePasswordQuery = `
      update user 
      set password = '${newPasswordHashed}'
      where username = '${username}'`;
        await db.run(upDatePasswordQuery);
        response.status(200);
        response.send("Password updated");
      }
    }
  }
});

module.exports = app;
