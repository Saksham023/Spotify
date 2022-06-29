var express = require('express'); // Express web server framework
 var request = require('request'); // "Request" library
 var cors = require('cors');
 const url = require('url');
 var querystring = require('querystring');
 var cookieParser = require('cookie-parser');
 const path = require('path');
 const ColorThief = require('colorthief');
const { read } = require('fs');

var router = express.Router();

router.use(express.urlencoded({extended:true}));

 var client_id = '9ddc7e09db6d4babb7d05f4d573fbf9b'; // Your client id
 var client_secret = '784b3df20acb4a70a329f370ac2cf69c'; // Your secret
 var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
//  var client_id = '612a03d033ac4941be39c235820779a7'; // Your client id
//  var client_secret = '5e38848bdf3948118d1472a5bdff8dbd'; // Your secret
//  var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

//  const token=0;
 
 /**
  * Generates a random string containing numbers and letters
  * @param  {number} length The length of the string
  * @return {string} The generated string
  */
 var generateRandomString = function(length) {
   var text = '';
   var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
 
   for (var i = 0; i < length; i++) {
     text += possible.charAt(Math.floor(Math.random() * possible.length));
   }
   return text;
 };
 
 var stateKey = 'spotify_auth_state';
 
 router.use(express.static(path.join(__dirname, '..', 'public')))
    .use(cors())
    .use(cookieParser());
 
 router.get('/', function(req, res) {
 
   var state = generateRandomString(16);
   res.cookie(stateKey, state);
 
   // your application requests authorization
   var scope = 'user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private user-top-read';
   res.redirect('https://accounts.spotify.com/authorize?' +
     querystring.stringify({
       response_type: 'code',
       client_id: client_id,
       scope: scope,
       redirect_uri: redirect_uri,
       state: state
     }));
 });
 
 router.get('/callback', function(req, res) {
 
   // your application requests refresh and access tokens
   // after checking the state parameter
 
   var code = req.query.code || null;
   var state = req.query.state || null;
   var storedState = req.cookies ? req.cookies[stateKey] : null;
 
   if (state === null || state !== storedState) {
     res.redirect('/#' +
       querystring.stringify({
         error: 'state_mismatch'
       }));
   } else {
     res.clearCookie(stateKey);
     var authOptions = {
       url: 'https://accounts.spotify.com/api/token',
       form: {
         code: code,
         redirect_uri: redirect_uri,
         grant_type: 'authorization_code'
       },
       headers: {
         'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
       },
       json: true
     };
 
     // console.log(authOptions);
     request.post(authOptions, function(error, response, body) {
       // console.log(body);
       if (!error && response.statusCode === 200) {
 
         var access_token = body.access_token,
             token = access_token;
             refresh_token = body.refresh_token;
 
            //  var options = {
            //     url: 'https://api.spotify.com/v1/recommendations?seed_artists=6LEG9Ld1aLImEFEVHdWNSB&seed_artists=4PULA4EFzYTrxYvOVlwpiQ&seed_tracks=5W7DOVGQLTigu09afW7QMT&seed_tracks=7AW4g4I9fPfUIyqtbsuAkM&limit=6',
            //     headers: { 'Authorization': 'Bearer ' + access_token },
            //     json: true
            //   };
            
            //   request.get(options, function(error, response, body) {
            //     let name_arr = [];
            //     let img_arr = [];
            //     for(i=0; i<6; i++){
            //         name_arr.push(body.tracks[i].name);
            //         // console.log(body.tracks[i].id);
            //         let ur = 'https://api.spotify.com/v1/tracks/' + body.tracks[i].id;
            //         var options1 = {
            //           url: ur,
            //           headers: { 'Authorization': 'Bearer ' + access_token },
            //           json: true
            //         };
            //         request.get(options1, function(error, response, body1) {
            //           img_arr.push(body1.album.images[0].url)
            //           // console.log(body1.album.images[0].);
            //           console.log(img_arr);
            //         })
            //       }
            //     console.log(name_arr);
       };
        res.render('index', {access_token});
      });
   }
 });

 
 router.get('/refresh_token', function(req, res) {
   // requesting access token from refresh token
   var refresh_token = req.query.refresh_token;
   var authOptions = {
     url: 'https://accounts.spotify.com/api/token',
     headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
     form: {
       grant_type: 'refresh_token',
       refresh_token: refresh_token
     },
     json: true
   };
 
   request.post(authOptions, function(error, response, body) {
     if (!error && response.statusCode === 200) {
       var access_token = body.access_token;
       token = access_token;
       res.send({
         'access_token': access_token
       });
     }
   });
 });


 router.get('/album/:uri/:token', function(req, res){
  const {uri, token} = req.params;
  // console.log(token);
  // console.log(uri);
  const id = uri.split(':')[2];
  
  var options = {
    url: 'https://api.spotify.com/v1/albums/'+id,
    headers: { 'Authorization': 'Bearer ' + token },
    json: true
  };
  
  request.get(options, function(error, response, body) {
    let arr = [];
    for(let obj of body.artists){
      arr.push(obj.name);
    }
    let str = arr.join(', ');
    // console.log(body.tracks);
    
    let tracks_arr = [];
    for(let temp_tr of body.tracks.items){
      let arr1 = [];
      for(let obj of temp_tr.artists){
        arr1.push(obj.name);
      }
      let str1 = arr1.join(', ');
      
      const ob = {
        track_name: temp_tr.name,
        track_artist: str1,
        duration: millisToMinutesAndSeconds(temp_tr.duration_ms),
        track_num: temp_tr.track_number,
        uri: temp_tr.uri,
      }
      tracks_arr.push(ob);
    }

    ColorThief.getColor(body.images[0].url)
    .then(color => { 
      // console.log((color.toString().split(',')));
      let dat = body.release_date.split('-')[0];
      const color_rgb = {
        red: color.toString().split(',')[0],
        green: color.toString().split(',')[1],
        blue: color.toString().split(',')[2],
      }

      const obj = {
      img: body.images[0].url,
      name: body.name,
      artist: str,
      num: body.total_tracks,
      year: dat,
      color: color_rgb,
      tracks: tracks_arr,
      }
  
    // console.log(obj);
    res.send(obj);
    // res.render('playlist', {obj});
    })
    .catch(err => { console.log(err) })

  })
})


 router.get('/artist/:uri/:token', function(req, res){
  const {uri, token} = req.params;
  // console.log(token);
  // console.log(uri);
  const id = uri.split(':')[2];


  // https://api.spotify.com/v1/artists/id

  var options1 = {
    url: 'https://api.spotify.com/v1/artists/'+id,
    headers: { 'Authorization': 'Bearer ' + token },
    json: true
  };
  request.get(options1, function(error, response, body) {
    // console.log(body);
    let str = body.name;

  
  var options = {
    url: 'https://api.spotify.com/v1/artists/'+ id + '/top-tracks?market=IN',
    headers: { 'Authorization': 'Bearer ' + token },
    json: true
  };
  
  request.get(options, function(error, response, body1) {
    let tracks_arr = [];
    for(let temp_tr of body1.tracks){
      let arr1 = [];
      for(let obj of temp_tr.artists){
        // console.log(obj);
        arr1.push(obj.name);
      }
      let str1 = arr1.join(', ');
      
      const ob = {
        track_name: temp_tr.name,
        track_artist: str1,
        duration: millisToMinutesAndSeconds(temp_tr.duration_ms),
        uri: temp_tr.uri,
      }
      tracks_arr.push(ob);
    }

    ColorThief.getColor(body.images[0].url)
    .then(color => { 
      const color_rgb = {
        red: color.toString().split(',')[0],
        green: color.toString().split(',')[1],
        blue: color.toString().split(',')[2],
      }

      const obj = {
      img: body.images[0].url,
      name: body.name,
      color: color_rgb,
      tracks: tracks_arr,
      }
  
    // console.log(obj);
    res.send(obj);
    })
    .catch(err => { console.log(err) })

  })
})
})



router.get('/playlist/:uri/:token', function(req, res){
  const {uri, token} = req.params;
  // console.log(token);
  // console.log(uri);
  const id = uri.split(':')[2];
  
  var options = {
    url: 'https://api.spotify.com/v1/playlists/'+id+'?limit=200',
    headers: { 'Authorization': 'Bearer ' + token },
    json: true
  };
  
  request.get(options, function(error, response, body) {
    // console.log(body);
    
    let tracks_arr = [];
    for(let temp_tr of body.tracks.items){
      // console.log(temp_tr);
      let arr1 = [];
      if(temp_tr.track != null){
        for(let obj of temp_tr.track.artists){
          arr1.push(obj.name);
        }
      
      let str1 = arr1.join(', ');
      
      const ob = {
        track_name: temp_tr.track.name,
        track_artist: str1,
        duration: millisToMinutesAndSeconds(temp_tr.track.duration_ms),
        // track_num: temp_tr.track_number,
        uri: temp_tr.track.uri,
        track_album: temp_tr.track.album.name,
      }
      tracks_arr.push(ob);
    }
    }

    ColorThief.getColor(body.images[0].url)
    .then(color => { 
      const color_rgb = {
        red: color.toString().split(',')[0],
        green: color.toString().split(',')[1],
        blue: color.toString().split(',')[2],
      }

      const obj = {
        img: body.images[0].url,
        name: body.name,
        des: body.description,
        // num: body.total_tracks,
        color: color_rgb,
        tracks: tracks_arr,
      }
  
    // console.log(obj.tracks[0]);
    res.send(obj);
    })
    .catch(err => { console.log(err) })
  })
})


// ---------------------For liked Page---------------------
router.get('/liked/:token', function(req, res){
  const {token} = req.params;
  // console.log(token);
  // console.log(uri);
  // const id = uri.split(':')[2];
  
  var options = {
    url: 'https://api.spotify.com/v1/me/tracks?limit=50',
    headers: { 'Authorization': 'Bearer ' + token },
    json: true
  };
  
  request.get(options, function(error, response, body) {
    // console.log(body.items[0].track.name);
    // console.log(body.items[0].track.artists[0].name);
    
    let tracks_arr = [];
    for(let temp_tr of body.items){
      // console.log(temp_tr);
      let arr1 = [];
      if(temp_tr.track != null){
        for(let obj of temp_tr.track.artists){
          arr1.push(obj.name);
        }
      
      let str1 = arr1.join(', ');
      
      const ob = {
        track_name: temp_tr.track.name,
        track_artist: str1,
        duration: millisToMinutesAndSeconds(temp_tr.track.duration_ms),
        // track_num: temp_tr.track_number,
        uri: temp_tr.track.uri,
        track_album: temp_tr.track.album.name,
      }
      tracks_arr.push(ob);
    }
    }

    ColorThief.getColor(path.join(__dirname, '..', 'public', 'liked_big.png'))
    .then(color => { 
      const color_rgb = {
        red: color.toString().split(',')[0],
        green: color.toString().split(',')[1],
        blue: color.toString().split(',')[2],
      }

      const obj = {
        color: color_rgb,
        tracks: tracks_arr,
      }
  
      // console.log(obj);
    res.send(obj);
    })
    .catch(err => { console.log(err) })
  })
})


router.get('/liked_list/:token', function(req, res){
  const {token} = req.params;
  // console.log(token);
  // console.log(uri);
  // const id = uri.split(':')[2];
  
  var options = {
    url: 'https://api.spotify.com/v1/me/tracks?limit=50',
    headers: { 'Authorization': 'Bearer ' + token },
    json: true
  };
  
  request.get(options, function(error, response, body) {
    // console.log(body.items[0].track.name);
    // console.log(body.items[0].track.artists[0].name);

    let arr = [];
    for(let obj of body.items){
      const object = {
        name: obj.track.name,
        artist: obj.track.artists[0].name,
      }
      arr.push(object);
    }

    res.send({arr});
  })
})

// ---------------------For lib Page---------------------
router.get('/lib/:token', function(req, res){
  const {token} = req.params;
  // console.log(token);
  // console.log(uri);
  // const id = uri.split(':')[2];
  
  var opt = {
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + token },
    json: true
  };

  request.get(opt, function(error, response, body) {
    let user_id = body.id;

  var options = {
    url: 'https://api.spotify.com/v1/users/'+user_id+'/playlists?limit=30',
    headers: { 'Authorization': 'Bearer ' + token },
    json: true
  };
  
  request.get(options, function(error, response, body) {
    // console.log(body);
    
    let playlist_arr = [];
    for(let temp_play of body.items){
      // console.log(temp_play); 
      const ob = {
        name: temp_play.name,
        uri: temp_play.uri,
        des: temp_play.description,
        image: temp_play.images[0].url,
      }
      playlist_arr.push(ob);
    }

      const obj = {
        playlists: playlist_arr,
      }
  
      // console.log(obj);
    res.send(obj);
  })
})
})



// --------------------------Request for search------------
router.get('/search/:token/:value', function(req, res){
  const {token,value} = req.params;
  //const {search} = req.body;
  // console.log(search);

  var options = {
    url: `https://api.spotify.com/v1/search?&q=${value}&type=track,album,artist,playlist`,
    headers: { 'Authorization': 'Bearer ' + token },
    json: true
  };
  
  request.get(options, function(error, response, body) {
     
    //res.send(body);
    // console.log(body);
    // adding search tracks
    let tracks_arr = [];
    for(let temp_tr of body.tracks.items){
       //console.log(temp_tr);
      let arr1 = [];
      if(temp_tr.artists != null){
        for(let obj of temp_tr.artists){
          arr1.push(obj.name);
        }
      
      let str1 = arr1.join(', ');
      
      const ob = {
        track_name: temp_tr.name,
        track_artist: str1,
        duration: millisToMinutesAndSeconds(temp_tr.duration_ms),
        // track_num: temp_tr.track_number,
        uri: temp_tr.uri,
        track_image : temp_tr.album.images[0],
        track_album: temp_tr.album.name,
      }
      // console.log('hey');
      tracks_arr.push(ob);
    }
    }
    //res.send(tracks_arr);
    // adding search artists
    let artist_ar = [];
    for(let temp_ar of body.artists.items){
      // console.log(temp_tr);
     
      const ob = {
        artist_name: temp_ar.name,
        artist_image: temp_ar.images[0],
        uri: temp_ar.uri,
        
      }
      artist_ar.push(ob);
    }

    let album_ar = [];
    for(let temp_ar of body.albums.items){
      // console.log(temp_tr);
      let arr1 = [];
      if(temp_ar.artists != null){
        for(let obj of temp_ar.artists){
          arr1.push(obj.name);
        }
      
      let str1 = arr1.join(', ');
      const ob = {

        album_name: temp_ar.name,
        albums_artists : str1,
        album_image: temp_ar.images[0],
        uri: temp_ar.uri,
        
      }
      album_ar.push(ob);
    }
  }
  let playlist_ar = [];
  for(let temp_ar of body.playlists.items){
    // console.log(temp_tr);
   
    const ob = {

      playlist_name: temp_ar.name,
      playlist_desc : temp_ar.description,
      playlist_image: temp_ar.images[0],
      uri: temp_ar.uri,
      
    }
    playlist_ar.push(ob);
  }
  
    const obj = {
      tracks : tracks_arr,
      artist : artist_ar,
      album : album_ar,
      playlist : playlist_ar,
    }

    res.send(obj);
  })
  
})


//----------------end-----------------------


function millisToMinutesAndSeconds(millis) {
  var minutes = Math.floor(millis / 60000);
  var seconds = ((millis % 60000) / 1000).toFixed(0);
  return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

module.exports = router;