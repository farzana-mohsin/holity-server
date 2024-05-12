require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      // "https://cars-doctor-f17c1.web.app",
      // "https://cars-doctor-f17c1.firebaseapp.com",
    ],
    // [], we need to change it while sending it to production
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = "mongodb://localhost:27017";

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster81657.uygasmd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster81657`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middlewares
const logger = (req, res, next) => {
  console.log(req.method, req.url);
  next();
};

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log("token in the middleware", token);

  // token not available
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    // error
    if (err) {
      console.log("error from verifyToken method", err);
      return res
        .status(401)
        .send({ message: "failed in verifyToken, unauthorized access" });
    }
    // if token is valid, then it would be decoded
    // console.log("value in the token", decoded);

    console.log(decoded);
    req.user = decoded;
  });

  next();
};

const verifyEmail = (req, res, next) => {
  if (req.query.email !== req.user.email) {
    return res
      .status(403)
      .send({ message: "forbidden access due to wrong email" });
  }

  next();
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const postsCollection = client.db("volunteers").collection("posts");
    const applicationsCollection = client
      .db("volunteers")
      .collection("applications");

    // auth related API

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      console.log("token owner info", req.user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "10d",
      });

      res
        .cookie("token", token, {
          // expiresIn: "1d",
          httpOnly: true,
          secure: true,
          sameSite: "none",
          // maxAge: 2 * 60 * 60 * 1000,
        })
        .send({ token });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // posts related API
    app.get("/posts", async (req, res) => {
      const limit = parseInt(req.query.limit);

      const cursor = postsCollection.find().sort({ deadline: 1 }).limit(limit);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/posts", async (req, res) => {
      const newPosts = req.body;
      const result = await postsCollection.insertOne(newPosts);
      res.send(result);
    });

    // search by post title
    app.post("/posts-by-title", async (req, res) => {
      const searchString = req.body.key;
      console.log(searchString);

      const query = {
        postTitle: {
          $regex: searchString,
          $options: "i",
        },
      };

      const result = await postsCollection.find(query).toArray();
      res.send(result);
    });

    // get a single post data
    app.get("/post/:id", logger, verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postsCollection.findOne(query);
      res.send(result);
    });

    // get all posts posted by a specific user
    app.get("/posts/:email", async (req, res) => {
      // const tokenEmail = req.user.email
      const email = req.params.email;
      // if (tokenEmail !== email) {
      //   return res.status(403).send({ message: 'forbidden access' })
      // }
      const query = { "postCreator.email": email };
      const result = await postsCollection.find(query).toArray();
      res.send(result);
    });

    // delete a post data from db
    app.delete("/post/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postsCollection.deleteOne(query);
      res.send(result);
    });

    // update a post in db
    app.put("/post/:id", async (req, res) => {
      const id = req.params.id;
      const postData = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...postData,
        },
      };
      const result = await postsCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // save an application in DB
    app.post("/applications", async (req, res) => {
      const applicationData = req.body;
      const result = await applicationsCollection.insertOne(applicationData);

      const postId = applicationData.postId;
      const query = { _id: new ObjectId(postId) };
      const updateDoc = { $inc: { numberOfVolunteers: -1 } };
      await postsCollection.updateOne(query, updateDoc);

      res.send(result);
    });

    // Get all all application requests from db for post creator
    app.get("/application-requests/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "postCreator.email": email };
      const result = await applicationsCollection.find(query).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("volunteer management website is running");
});

app.listen(port, () => {
  console.log(`volunteer management server is running on port ${port}`);
});
