var fs=require('fs'); 
var bencode = require('bencode');
var crypto = require('crypto')
var $ = require('jquery'); 
var http = require('http'); 
var assert = require('assert');

eval(require('fs').readFileSync('./lib/utf8.js', 'utf8'));

var test = {}; 
test.hash_hex =  "df4b5c27c7d24d1d906a927c1ac98297c6f7e67a";
test.hash_hex_size = 40; 
test.hash_size = 20; 
test.encodeHash = "%dfK%5c%27%c7%d2M%1d%90j%92%7c%1a%c9%82%97%c6%f7%e6z"; 

var ourTorrent ={}; 
ourTorrent.errorNoTorrentFile = "You must specify a torrent file"; 
ourTorrent.usage = "USAGE : node ourTorrent.js file.torrent"; 
ourTorrent.peer_id = "PS1988176532124687AB"; 
ourTorrent.port    = 6881;
ourTorrent.peers   = []; 

function TorrentFile(){}; 

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length); // 2 bytes for each char
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function hex2str(hex) {
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

function dec2str(hex) {
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 10));
    return str;
}


function getTorrentPath() {
  return process.argv[2];
}

function hash (info) {
 var shasum = crypto.createHash('sha1');
 shasum.update(bencode.encode(info));
 return shasum.digest('hex');
}

function URLRequest(baseURL, params) {
  var no_first = 0, url=baseURL; 
  for (var key in params) 
      url += ((no_first++)?'&':'?') + key + '=' + escape(params[key]);
  return url; 
}

function errorHandler(error) {
   console.log("Got error: " + e.message); 
   exit();
}

function handleTrackerResponse(response) {
  response.on('data',peerConnection)
          .on('error',errorHandler); 
}

function getPeers(peers) {
  var peer_array = [];
  var peer_number =  peers.length/6;
  for ( var i=0, j=0; i<peers.length; i+=6, j++)  
     peer_array[j] = { 
       ip :peers[i] + "." +  peers[i+1] + "." + peers[i+2] + "." + peers[i+3],  
       port: peers[i+5] + (peers[i+4] << 8)
     }
  console.log(peer_array);
}

function peerConnection(data) {
  var response = bencode.decode(data); 
  console.log("Interval : " + response.interval);
  // this works only for binary peers 
  console.log("Number of peers :" +  response.peers.length/6); 
  ourTorrent.peers = getPeers(response.peers); 

};

var main = function(){
  console.log("Welcome to OURTorrent!!!"); 

  var torrentFile = new TorrentFile();  
  torrentFile.path = getTorrentPath();

  if(torrentFile.path === undefined) {
    console.log(ourTorrent.errorNoTorrentFile); 
    console.log("\t" + ourTorrent.usage); 
    return; 
  }

  console.log("Torrent : " + torrentFile.path);  
  torrentFile.rawData    = fs.readFileSync(torrentFile.path); 
  torrentFile.decodedData = bencode.decode(torrentFile.rawData);
  torrentFile.size = torrentFile.decodedData.info.length;
  torrentFile.name = torrentFile.decodedData.info.name;
  torrentFile.tracker = torrentFile.decodedData.announce;
 
  console.log("Tracker : " + torrentFile.tracker); 
  console.log("File    : " + torrentFile.name); 
  console.log("Size    : " + torrentFile.size + " B"); 
  
  torrentFile.hash_hex = hash(torrentFile.decodedData.info);
  assert(test.hash_hex == torrentFile.hash_hex); 
  assert(test.hash_hex_size == torrentFile.hash_hex.length); 
  console.log("Hash hex: " + torrentFile.hash_hex); 

  torrentFile.hash = hex2str(torrentFile.hash_hex); 
  assert(test.hash_size == torrentFile.hash.length );  
  console.log("Hash    : " + torrentFile.hash); 
 
  var params = { 
    info_hash: torrentFile.hash, 
    event: 'started',
    peer_id: ourTorrent.peer_id,
    port: ourTorrent.port,
    downloaded: 0,
    uploaded: 0,
    compact: 1,
    numwant: 50,
    left: torrentFile.size 
  };
  
  console.log("URL     : " +  URLRequest(torrentFile.tracker, params));  
  
  console.log("Connecting to the remote server...."); 
  http.get(URLRequest(torrentFile.tracker, params),  handleTrackerResponse)
}

if (require.main === module) {
     main();
}
