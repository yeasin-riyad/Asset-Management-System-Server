const express = require('express');
const jwt = require('jsonwebtoken');
const cors=require('cors');
require('dotenv').config(); 


const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const stripe = require('stripe')(process.env.PAYMENT_SECRET);



const port = process.env.PORT || 9000;
const app = express()

const corsOptions={
    origin:true,
    credentials:true,
    optionSuccessStatus:200,
}

app.use(cors(corsOptions))

// app.use(cors(corsOptions))
app.use(cookieParser())

app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gx2sshg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Verify Token MiddleWare..........
const verifyJWT = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
      return res.status(403).send('Token is required');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
          return res.status(401).send('Invalid token');
          
      }
      req.user = decoded; 
      next();
  });
};

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

    const Assets=client.db("MyAssets").collection("Assets")
    const Users=client.db("MyAssets").collection("Users")
    const Payment_Collections=client.db("MyAssets").collection("Payment_Collection")
    const Employee_Requests=client.db("MyAssets").collection("Employee_Requests")



    // sava user in db........
    app.post('/saveUser', async (req, res) => {
      const { user } = req.body;
    
      const query = { email: user.email }; 
      const existingUser = await Users.findOne(query);
    
      if (existingUser) {
        return res.status(200).json({ message: 'User already exists' });
      } else {
        const result = await Users.insertOne(user);
        res.status(201).send(result);
      }
    });
    


    // Create Token

    app.post('/create-token', async (req, res) => {
      const { email } = req.body;
  
      // Perform your user authentication logic here...
  
      if (email) {
          const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
          res.json({ token });
      } else {
          res.status(401).send('Authentication failed');
      }
  });
    

    // Check User Role
    app.get('/checkRole/:email',async (req, res) => {
      const email = req.params.email;  
      const query={email}
      try {
        const user = await Users.findOne(query);
       
        if (user) {
          res.json({ role: user.role });
        } else {
          res.status(404).json({ message: 'User not found' });
        }
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });


     // Get PayMentId From DB......

     app.get('/getPaymentId',verifyJWT,async(req,res)=>{
      const email = req.query.email;

      const PaymentId=await Payment_Collections.findOne({email})
      res.send({PaymentId:PaymentId?.transactionId})
    })

  // Get All The Assets from Db For a User...
   
  app.get('/assets/:email?',verifyJWT,async (req, res) => {
   
    const { search, filter } = req.query;
    const HREmail = req.params.email;
    let query = {};
  
    if (HREmail) {
      query.HREmail = HREmail;
    }
  
    if (search) {
      query.productName = { $regex: search, $options: 'i' };
    }
  
    if (filter) {
      if (filter.availability) {
        query.stockStatus = filter.availability;
      }
      if (filter.assetType) {
        query.assetType = filter.assetType;
      }
    }
  
    try {
      const assets = await Assets.find(query).toArray();
      res.send(assets);
    } catch (error) {
      res.status(500).send({ message: 'An error occurred while fetching the assets.', error });
    }
  });

  // Get Package Limit.....
  app.get('/package-limit/:email',verifyJWT,async(req,res)=>{
    const email=req.params.email;
    const query={email}
    const result=await Payment_Collections.findOne(query)
    res.send({amount:result?.amount})
  })
  
// Update Assets Quantity
app.patch('/update-asset-quantity/:id',verifyJWT,async(req,res)=>{
  const id=req.params.id;
  const {productQuantity}=req.body;
  const query={_id:new ObjectId(id)}
  const updateDoc={
    $set:{
      productQuantity
    }
  }

  const result=await Assets.updateOne(query,updateDoc);
  res.send(result)
})


// Get all the requested assets for Logged In user....

app.get('/employee-requested/:email',verifyJWT, async (req, res) => {
  const { search, status, type } = req.query;
  const email=req.params.email;
  let query={'user.email':email}


  // Search by asset name
  if (search) {
    query['asset.productName'] = { $regex: search, $options: 'i' }; 
  }

  // Filter by request status
  if (status) {
    query.status = status;
  }

  // Filter by asset type
  if (type) {
    query['asset.assetType'] = type;
  }

 
    const assets = await Employee_Requests.find(query).toArray();
    res.send(assets);

});

// Delete an Asset by the user

app.delete('/employee-requested/:id',verifyJWT,async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const result=await Employee_Requests.deleteOne(query);
  res.send(result)
})

  // Get All The Assets from Db For a Hr....
  app.get(`/manager-assets/:email`,verifyJWT,async(req,res)=>{
   
    const email=req.params.email;
    const query={
      HREmail:email}
      const assets=await Assets.find(query).toArray()
      res.send(assets)
  })

  // Update An Asset By The HR Manager......
  app.put('/manager-assets/:id',verifyJWT,async(req,res)=>{
    const id=req.params.id;
    const query={_id : new ObjectId(id)}
    const {productName,productType,productQuantity,stockStatus}=req.body;
    const options = { upsert: true };
    const updateDoc = {
      $set: {
        
        productName,
        productType,
        productQuantity,
        stockStatus
        
      },
    };
    const result =await Assets.updateOne(query,updateDoc,options)
    res.send(result)

   })

  //  Delete an Asset by the user
  app.delete('/manager-assets/:id',verifyJWT,async(req,res)=>{
    const id=req.params.id;
    const query={_id : new ObjectId(id)}
    const result= await Assets.deleteOne(query)
    res.send(result)
   })

  //  Delete All Assets for a specific user....
  app.delete('/delete-assets/:email',verifyJWT,async(req,res)=>{
    const email=req.params.email;
    const query={'user.email':email};
    const anotherQuery={email}
    const result=await Employee_Requests.deleteMany(query);
    const result1=await Users.deleteOne(anotherQuery)
    res.send(result)

  })

  //  Add a product by the HR
  app.post('/manager-assets',verifyJWT,async(req,res)=>{
    const {productName,productType,productQuantity,assetType,HREmail}=req.body
    const dateAdded = new Date();

    const doc={productName,productType,productQuantity:parseInt(productQuantity),assetType,stockStatus:"available",dateAdded,HREmail}
    const result = await Assets.insertOne(doc);

    res.send(result)
   })
  


// Update Any Property in Assets........

app.patch('/assets/:id',verifyJWT,async(req,res)=>{
  const { quantity } = req.body;

  const id=req.params.id;
  const query={_id : new ObjectId(id)}
  const updateDoc = {
    $set: {
      
        productQuantity:quantity

    },
  };

  const result=await Assets.updateOne(query,updateDoc)
  res.send(result)

})

// Post An Asset in Employee Request Collection.............

app.post('/request-asset',verifyJWT, async (req, res) => {
  const { asset,  quantity, notes, requestDate, user, status } = req.body;
  const request = {
    asset,
    quantity,
    notes,
    requestDate,
    user,
    status,
  };

  try {
    const result= await Employee_Requests.insertOne(request);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'Error saving request' });
  }
});

// Get An Asset which status is pending and also all requested asset based on user demand for home page From Employee Request Collection.............

app.get(`/request-asset/:email`,verifyJWT,async(req,res)=>{
  const email=req.params.email;
  const status=req.query.status;
  const query={'user.email':email}
  if(status){
    query.status=status
  }
  const assets = await Employee_Requests.find(query).toArray();
  res.send(assets);

})

// Get All Requested Assets For Hr Home Page...
app.get(`/request-asset-hr/:email`,verifyJWT,async(req,res)=>{
  const email=req.params.email;
  const query={'asset.HREmail':email}

  const assets = await Employee_Requests.find(query).toArray();
  res.send(assets);

})

// Get all Accepted Assets for Hr Home Page...
app.get('/accepted-requests/:email',verifyJWT, async (req, res) => {
  const email=req.params.email;
  try {
    const acceptedRequests = await Employee_Requests.find({'asset.HREmail':email, status: 'approved' })
      .sort({ 
        approvalDate: -1 })
      .limit(5)
      .toArray();
    res.send(acceptedRequests);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch accepted requests' });
  }
});
// Get all Rejected Assets for Hr Home Page...
app.get('/rejected-requests/:email',verifyJWT, async (req, res) => {
  const email=req.params.email;

  try {
    const rejectedRequests = await Employee_Requests.find({'asset.HREmail':email, status: 'rejected' })
      .sort({ requestDate: -1 })
      .limit(5)
      .toArray();
    res.send(rejectedRequests);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch rejected requests' });
  }
});

// My Employee List For HR Manager..
app.get('/my-employee-list/:email',verifyJWT, async (req, res) => {
  const email = req.params.email;
  const query = { 'HrEmail': email };

  const result=await Users.find(query).toArray();
  res.send(result)
});

// Employee Who is not Affiliated with any company....
app.get('/unaffiliated-users/:email',verifyJWT, async (req, res) => {
  const email = req.params.email;
  const unaffiliatedQuery = { 'HrEmail': { $exists: false } };
  const affiliatedQuery = { 'HrEmail': email };
  const packageLimitQuery={email}

  try {
    // Query for unaffiliated users
    const unaffiliatedUsers = await Users.find(unaffiliatedQuery).toArray();

    // Query for the count of affiliated users
    const affiliatedCount = await Users.countDocuments(affiliatedQuery);
        // Query for the Package Limit...

        const packageLimit=await Users.findOne(packageLimitQuery)




    res.send({
      unaffiliatedUsers,
      affiliatedCount,
      packageLimit:packageLimit.Package
    });
  } catch (error) {
    res.status(500).send({ message: 'An error occurred while fetching the employee list.', error });
  }
});



  // Update User Information...
  app.patch('/update-user-info/:email',verifyJWT, async (req, res) => {
    const email = req.params.email;
    const query = { email };
    const {HrEmail,companyName,companyLogoUrl}=req.body;
  
    try {
      // First, find the user to check if HrEmail is already set
      const user = await Users.findOne(query);
  
      if (!user) {
        return res.status(404).send({ message: 'User not found' });
      }
  
      if (user.HrEmail) {
        return res.status(400).send({ message: 'HrEmail already exists' });
      }
  
      // If HrEmail is not set, proceed with the update
      const updateDoc = {
        $set: {
          HrEmail,
          companyName,
          companyLogoUrl
        },
      };
  
      const result = await Users.updateOne(query, updateDoc,{upsert:true});
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: 'An error occurred', error });
    }
  });
  

//Check Who is MY HR Manager.......
app.get('/my-hr/:email',verifyJWT,async(req,res)=>{
  const email=req.params.email;
  const query={email}
  const result=await Users.findOne(query)
  res.send(result?.HrEmail)

})

// Get user Information.....
app.get('/my-Info/:email',verifyJWT,async(req,res)=>{
  const email=req.params.email;
  const query={email}
  const result=await Users.findOne(query);
  res.send(result)

})

// Update An User....
app.put('/update-user/:email',verifyJWT,async(req,res)=>{
  const query={email:req.params.email}
  const {displayName}=req.body;
  const updateDoc={
    $set:{
      displayName
    }
  }
  const result=await Users.updateOne(query,updateDoc)
  res.send(result)
})

// Employee List For Employee........

app.get('/my-team/:email?',verifyJWT, async (req, res) => {
  const email=req.params.email;
  const query = { };
  if(email){
    query.HrEmail=email
  }

  const result= await Users.find(query).toArray();
  res.send(result)
  

  
});



// Get Top Requested Items For Hr Home

app.get('/top-requested-items/:email',verifyJWT, async (req, res) => {
  const email = req.params.email;
  

    const topItems = await Employee_Requests.aggregate([
      {
        $match: {
          'asset.HREmail': email
        }
      },
      {
        $group: {
          _id: '$asset.productName',
          productName: { $first: '$asset.productName' },
          productType: { $first: '$asset.productType' },
          requestCount: { $sum: 1 }
        }
      },
      {
        $sort: { requestCount: -1 }
      },
      {
        $limit: 4
      }
    ]).toArray();

    res.send(topItems);

});

// Get Assets which quantity less then 10 for hr Home page
app.get('/limited-stock-items/:email',verifyJWT, async (req, res) => {
  const email = req.params.email;

  const limitedStockItems = await Assets.aggregate([
    {
      $match: {
        'HREmail': email,
        'productQuantity': { $lt: 10 }
      }
    },
    {
      $project: {
        _id: 1,
        productName: '$productName',
        productType: '$productType',
        productQuantity: '$productQuantity'
      }
    },
    {
      $sort: { 'productQuantity': 1 }
    }
  ]).toArray();
  res.send(limitedStockItems);
});




// Get all Employee Requested Assets for hr manager which status is pending or Approved or rejected from Employee Requested Assets....
app.get('/employee-requested-assets/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;

  const query = {
    'asset.HREmail': email,
    status: { $in: ["pending", "approved", "rejected"] }
  };

  try {
    const assets = await Employee_Requests.find(query).toArray();
    res.send(assets);
  } catch (error) {
    res.status(500).send({ message: "Error retrieving assets", error });
  }
});


// Get all Employee Requested Assets for hr manager which status is pending from Employee Requested Assets....
app.get('/employee-requested-assets-pending/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;

  const query = {
    'user.email': email,
    status:"pending"
  };

  try {
    const assets = await Employee_Requests.find(query).toArray();
    res.send(assets);
  } catch (error) {
    res.status(500).send({ message: "Error retrieving assets", error });
  }
});

//  API for Recent Approvals

app.get('/recent-approvals/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;

  try {
    const query = {
      'asset.HREmail': email,
      'user.status': 'approved'
    };
    const options = {
      sort: { 'user.approvalDate': -1 }, // Sort by most recent approvals
      limit: 5 // Limit to the 5 most recent approvals
    };

    const recentApprovals = await Employee_Requests.find(query, options).toArray();
    res.send(recentApprovals);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch recent approvals', error });
  }
});


// API for Asset Request History

app.get('/asset-request-history/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;

  try {
    const query = {
      'asset.HREmail': email,
      'user.status': { $in: ['pending', 'approved', 'rejected'] } // Fetch all relevant statuses
    };
    const options = {
      sort: { 'user.requestDate': -1 } // Sort by most recent requests
    };

    const requestHistory = await Employee_Requests.find(query, options).toArray();
    res.send(requestHistory);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch asset request history', error });
  }
});



//Update Status by The Hr...
app.patch('/update-status/:id',verifyJWT,async(req,res)=>{
  const {status}=req.body
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const updateDoc={
    $set:{
      status

    }
  }
  if (status === "approved") {
    updateDoc.$set.approvalDate = new Date();
  }
  const result=await Employee_Requests.updateOne(query,updateDoc,{upsert:true});
  res.send(result)

})



  // My Payment_Collection

  app.post('/Payment_Collection/:email', async (req, res) => {
    const email = req.params.email;
    const data = req.body;

    try {
        // Check if the email already exists in the collection
        const existingPayment = await Payment_Collections.findOne({ email: email });

        if (existingPayment) {
            // Update the existing document with the new payment information
            const updateResult = await Payment_Collections.updateOne(
                { email: email },
                {
                    $set: {
                        transactionId: data.transactionId,
                        amount: data.amount,
                        date: new Date(),
                    }
                }
            );
            res.send(updateResult);
        } else {
            // Insert the new document if email doesn't exist
            const insertResult = await Payment_Collections.insertOne(data);
            res.send(insertResult);
        }
    } catch (error) {
        res.status(500).send({ message: "An error occurred while processing the payment." });
    }
});





   


     // Payment Code 
     app.post('/create-payment-intent', async (req, res) => {
      const { amount} = req.body;
     

if (!amount) {
  return res.status(400).json({ error: 'Amount is required' });
}
    
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount:parseInt(amount*100),
          currency: 'usd',
          automatic_payment_methods:{
            enabled:true
          }
        });
    
        res.status(200).json({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        res.status(500).json({ error: 'An error occurred while creating payment intent.' });
      }
    });




     // Test Server
     app.get('/', (req, res) => {
        res.send('Hello World Again!')
      })
      
      app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
      })
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
  }
}
run().catch(console.dir);
