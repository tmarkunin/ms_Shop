var express = require('express');
var app = express();
var bodyParser = require('body-parser'); // not needed once split
var mongoose = require('mongoose');			 // Same ^^
var faker = require('faker');

// serve the files out of ./public as our main files - only app.js
app.use(express.static(__dirname + '/public'));
app.use('/bower_components',  express.static(__dirname + '/bower_components'));

// configure app to use bodyParser() - used by all services
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

// MongoDB - used by all services
if(process.env.VCAP_SERVICES){
	var services = JSON.parse(process.env.VCAP_SERVICES);
   if(services.mongodb) {
    uri = services.mongodb[0].credentials.url;
  }
	else if (services['compose-for-mongodb']){
  	
  	uri = services['compose-for-mongodb'][0].credentials.uri;
  } else {
    uri = process.env.MONGO_URI;
  }
} else {
	uri = process.env.MONGO_URI;
}

mongoose.connect(uri);

// Mongoose Models
var Product = require('./models/product'); // used in cart & product services
var Review = require('./models/review');	 // used in review service

// Set up /api router - (all services)
var router = express.Router();

// middleware to use for all requests (JSON) - (all services)
router.use(function(req, res, next) {
		var body = JSON.stringify(req.body);
    console.log('[Request] '+req.method+' ' + req.url + ' - Body: ' + body);
    next();
});


/* ------------------------------------------------------------------------
--  F A K E R  A P I  -----------------------------------------------------
------------------------------------------------------------------------ */

// Product json Faker
var jsonFaker = require('./faker.js');

app.get('/faker/:count', function(req, res) {
    Product.remove({}, function(err) {
       console.log('product collection removed')
    });

		Review.remove({}, function(err) {
       console.log('review collection removed')
    });

		// faker.js creates fake json and we insert it into the DB
    for (var i = 0; i < req.params.count; i++) {
        var sample = jsonFaker.fakeOut();
        var product = new Product();      // create a new instance of the Product model
        product.name = sample.name;  	  // set the products name (comes from the request)
        product.price = sample.price;
        product.description = sample.description;

				// used to append to image url - this prevents caching
				var randomInt = Math.floor(Math.random() * (1000 - 0));

        product.image = "http://lorempixel.com/360/300/?v=" + randomInt;
				product.inCart = false;
        product.save(function(err, prod) {
            if (err) { return console.error("Error faking data"); };

						// save reviews
						for (var i = 0; i < 2; i++) {
							var review = new Review();
							var fakeReview = jsonFaker.fakeReview()
							review.productId = prod.id;
							review.stars = fakeReview.stars;
							review.body = faker.lorem.sentence();
							review.author = fakeReview.author;
							review.save(function(err) {
			            if (err) { console.error("Error faking data"); };
			        });
						}
        });

    };

		console.log('Successfully faked '+req.params.count+' document(s)!');
    res.json({ message: 'Successfully faked '+req.params.count+' document(s)!' });
});

/* ------------------------------------------------------------------------
--  S T A R T  S E R V E R  -----------------------------------------------
------------------------------------------------------------------------ */

app.use('/api', router);

// get the app environment from Cloud Foundry
var port = process.env.PORT || 8080;

// start server on the specified port and binding host
app.listen(port, function() {
  console.log("server starting on port: " + port);
});
