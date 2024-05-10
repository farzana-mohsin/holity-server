require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(cors());
app.use(express.json());

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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const postsCollection = client.db("volunteers").collection("posts");
    const applicationsCollection = client
      .db("volunteers")
      .collection("applications");

    // posts related API
    app.get("/posts", async (req, res) => {
      const cursor = postsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/posts", async (req, res) => {
      const newPosts = req.body;
      const result = await postsCollection.insertOne(newPosts);
      res.send(result);
    });

    // get a single post data
    app.get("/post/:id", async (req, res) => {
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

    // save an application in DB
    app.post("/applications", async (req, res) => {
      const applicationData = req.body;
      const result = await applicationsCollection.insertOne(applicationData);
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
