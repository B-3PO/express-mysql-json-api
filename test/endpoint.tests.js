var request = require('request');
var server = require('./server/app.js');
var chai = require('chai');
var expect = chai.expect;



describe("Routes", function() {

  describe("Locations", function() {
    before(function () {
      server.listen(8000);
    });



    it('should contain version and handshake response headers', function(done) {
      request.head({
        url:'http://localhost:8000/locations',
        headers: {
          'd-m-version': 0,
          'd-m-handshake': true
        }
      }, function (error, response, body) {
        expect(response.headers['d-m-versioning']).to.not.be.undefined;
        expect(response.headers['d-m-handshake']).to.not.be.undefined;
        done();
      });
    });


    it('should return json api', function(done) {
      request.get({
        url:'http://localhost:8000/locations?include=people.jobs'
      }, function (error, response, body) {
        var parsed = JSON.parse(body);
        expect(parsed).to.have.property('data');
        expect(parsed).to.have.property('included');
        expect(parsed.data[0]).to.have.property('id');
        expect(parsed.data[0]).to.have.property('type');
        expect(parsed.data[0]).to.have.property('attributes');
        expect(parsed.data[0]).to.have.property('relationships');
        done();
      });
    });


    it('should add/update data', function(done) {
      request.put({
        url:'http://localhost:8000/people/77c55edf-0602-4671-b308-c116f9cc8f98',
        body: {
          data: {
            id: '77c55edf-0602-4671-b308-c116f9cc8f98',
            type: 'people',
            attributes: {
              name: 'test tester',
              age: 8,
              email: 'test@tester.com',
              working: false
            }
          }
        },
        json: true
      }, function (error, response, body) {
        expect(response.statusCode).to.be.equal(200);
        done();
      });
    });


    it('should delete resource', function(done) {
      request.del({
        url:'http://localhost:8000/job/77c55edf-0602-4671-b308-c116f9cc8f97'
      }, function (error, response, body) {
        expect(response.statusCode).to.be.equal(200);
        done();
      });
    });

    it('should add back resource', function(done) {
      request.put({
        url:'http://localhost:8000/job/77c55edf-0602-4671-b308-c116f9cc8f97',
        body: {
          data: {
            id: '77c55edf-0602-4671-b308-c116f9cc8f97',
            type: 'jobs',
            attributes: {
              title: 'progamer',
              pay: 1.23
            }
          }
        },
        json: true
      }, function (error, response, body) {
        expect(response.statusCode).to.be.equal(200);
        done();
      });
    });




    it('should delete single relationship', function(done) {
      request.del({
        url:'http://localhost:8000/people/33a87db0-ff5a-11e5-86aa-5e5517507c66/relationships/job',
        body: {
          data: {
            type: 'jobs',
            id: '77c55edf-0602-4671-b308-c116f9cc8f97'
          }
        },
        json: true
      }, function (error, response, body) {
        expect(response.statusCode).to.be.equal(200);
        done();
      });
    });
    it('should add back single relationship', function(done) {
      request.put({
        url:'http://localhost:8000/people/33a87db0-ff5a-11e5-86aa-5e5517507c66/relationships/job',
        body: {
          data: {
            type: 'jobs',
            id: '77c55edf-0602-4671-b308-c116f9cc8f97'
          }
        },
        json: true
      }, function (error, response, body) {
        expect(response.statusCode).to.be.equal(200);
        done();
      });
    });



    it('should remove many to many relationship', function(done) {
      request.del({
        url:'http://localhost:8000/locations/9d16411c-fe77-11e5-86aa-5e5517507c66/relationships/people',
        body: {
          data: {
            type: 'people',
            id: '33a87db0-ff5a-11e5-86aa-5e5517507c66'
          }
        },
        json: true
      }, function (error, response, body) {
        expect(response.statusCode).to.be.equal(200);
        done();
      });
    });
    it('should add back many to many relationship', function(done) {
      request.put({
        url:'http://localhost:8000/locations/9d16411c-fe77-11e5-86aa-5e5517507c66/relationships/people',
        body: {
          data: {
            type: 'people',
            id: '33a87db0-ff5a-11e5-86aa-5e5517507c66'
          }
        },
        json: true
      }, function (error, response, body) {
        expect(response.statusCode).to.be.equal(200);
        done();
      });
    });



    after(function () {
      server.close();
    });
  });
});
