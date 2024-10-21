const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

// middlewares
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ahphq0t.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const productCollection = client.db('WaveGadget').collection('product');

        
    app.get('/products', async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const brand = req.query.brand || '';
        const minPrice = parseFloat(req.query.minPrice) || 0;
        const maxPrice = parseFloat(req.query.maxPrice) || 10000;
        const sort = req.query.sort || '';

        const query = {
            name: { $regex: search, $options: 'i' },
            category: category ? category : { $exists: true },
            brand: brand ? brand : { $exists: true },
            price: { $gte: minPrice, $lte: maxPrice }
        };

        const sortOptions = {};
        if (sort === 'lowToHigh') sortOptions.price = 1;
        if (sort === 'highToLow') sortOptions.price = -1;
        if (sort === 'newest') sortOptions._id = -1;

        const total = await productCollection.countDocuments(query);
        const products = await productCollection.find(query)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        res.send({
            products,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        });
    });


    // add product
    app.put('/addproduct', async (req, res) => {
      const { name, image, category, price, brand } = req.body;

      // Validate the request body
      if (!name || !image || !category || !price || !brand) {
        return res.status(400).send({ message: "All fields are required" });
      }

      // Create the product object
      const newProduct = {
        name,
        image,
        category,
        price: parseFloat(price), // Ensure price is stored as a number
        brand
      };

      try {
        // Insert the product into the database
        const result = await productCollection.insertOne(newProduct);
        res.status(201).send({ message: 'Product added successfully', productId: result.insertedId });
      } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).send({ message: 'Failed to add product' });
      }
    });


    // Update a product by ID
    app.put('/products/:id', async (req, res) => {
      const { id } = req.params;
      const { name, image, category, price, brand } = req.body;

      // Validate the request body
      if (!name || !image || !category || !price || !brand) {
        return res.status(400).send({ message: 'All fields are required' });
      }

      const updatedProduct = {
        $set: {
          name,
          image,
          category,
          price: parseFloat(price), // Ensure price is a number
          brand
        }
      };

      try {
        // Find the product by ID and update it
        const result = await productCollection.updateOne(
          { _id: new ObjectId(id) },
          updatedProduct
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Product not found' });
        }

        res.send({ message: 'Product updated successfully' });
      } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).send({ message: 'Failed to update product' });
      }
    });

    
    // get product detail
    app.get('/product-detail/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

      // Delete item from cart
      app.delete('/products/:id', async (req, res) => {
        try {
            const { id } = req.params;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            console.log(query);
            const result = await productCollection.deleteOne(query);
            console.log(result);
            res.send(result);
          } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
          }
    });


    // Ping to confirm a successful connection to MongoDB
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } finally {
    // Do not close the MongoDB client in the server
    // await client.close();
  }
}

run().catch(console.dir);

// Default route
app.get('/', (req, res) => {
  res.send('ProductHub is Running');
});

app.listen(port, () => {
  console.log(`ProductHub is running on port ${port}`);
});
