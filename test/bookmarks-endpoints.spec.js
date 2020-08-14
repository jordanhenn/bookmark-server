const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const supertest = require('supertest')
const { makeBookmarksArray } = require('./bookmarks.fixtures')


describe('Bookmarks Endpoints', function() {
    let db

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())
  
    before('clean the table', () => db('bookmarks').truncate())

    afterEach('cleanup', () => db('bookmarks').truncate())

    describe('GET /bookmarks', () => {
        context('table has no data', () => {
            it('responds with 200 and an empty array', () => {
                return supertest(app)
                  .get('/bookmarks')
                  .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                  .expect(200, [])
              })
            })
        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray()
      
            beforeEach('insert bookmakrs', () => {
              return db
                .into('bookmarks')
                .insert(testBookmarks)
            })
      
            it('responds with 200 and all of the bookmarks', () => {
              return supertest(app)
                .get('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200, testBookmarks)
            })
          })
          context(`Given an XSS attack article`, () => {
            const testBookmarks = [
              {
                id: 911,
                title: 'Naughty naughty very naughty <script>alert("xss");</script>',
                url: 'https://www.goofballboys.com',
                description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
                rating: 2
              },
              {
                id: 2,
                title: 'Goofball Gals',
                url: 'https://www.goofballgals.com',
                description: 'A wesbite for the goofball gals.',
                rating: 3
              },
              {
                id: 3,
                title: 'Reggie Jackson',
                url: 'https://www.reggiejackson.com',
                description: `Reggie Jackson's personal website.`,
                rating: 5
              }
          ]
          
          const sanitizedBookmarks = [
            {
              id: 911,
              title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
              url: 'https://www.goofballboys.com',
              description: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`,
              rating: 2
            },
            {
              id: 2,
              title: 'Goofball Gals',
              url: 'https://www.goofballgals.com',
              description: 'A wesbite for the goofball gals.',
              rating: 3
            },
            {
              id: 3,
              title: 'Reggie Jackson',
              url: 'https://www.reggiejackson.com',
              description: `Reggie Jackson's personal website.`,
              rating: 5
            }
          ]
    
            beforeEach('insert malicious article', () => {
              return db
                .into('bookmarks')
                .insert(testBookmarks)
            })
    
            it('removes XSS attack content', () => {
              return supertest(app)
                .get(`/bookmarks`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200, sanitizedBookmarks)
            })
        })    
    })

    describe(`POST /bookmarks`, () => {
      it(`creates a bookmark, responding with 201 and the new bookmark`, function() {
        this.retries(3)
        const testBookmarks = makeBookmarksArray()
        const testBookmark = testBookmarks[0]
        return supertest(app)
          .post('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send(testBookmark)
          .expect(201)
          .expect(res => {
            expect(res.body.title).to.eql(testBookmark.title)
            expect(res.body.url).to.eql(testBookmark.url)
            expect(res.body.description).to.eql(testBookmark.description)
            expect(res.body.rating).to.eql(testBookmark.rating)
            expect(res.body).to.have.property('id')
            expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
          })
          .then(postRes => 
              supertest(app)
                .get(`/bookmarks/${postRes.body.id}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(postRes.body)
          )
      })

      it(`sanitizes posted article containing XSS attack`, function() {
        this.retries(3)
        const maliciousBookmark = {
          id: 911,
          title: 'Naughty naughty very naughty <script>alert("xss");</script>',
          url: 'https://www.google.com',
          description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
          rating: 3
        }
        return supertest(app)
          .post('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send(maliciousBookmark)
          .expect(201)
          .expect(res => {
            expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
            expect(res.body.url).to.eql(maliciousBookmark.url)
            expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
            expect(res.body.rating).to.eql(maliciousBookmark.rating)
            expect(res.body).to.have.property('id')
            expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
          })
          .then(postRes => 
              supertest(app)
                .get(`/bookmarks/${postRes.body.id}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(postRes.body)
          )
      })
    

        it(`responds with 400 and an error message where the 'title' is missing`, () => {
          const newBookmark = {
            url: 'https://www.newtestbookmark.com',
            rating: 3
          }

          return supertest(app)
            .post('/bookmarks')
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .send(newBookmark)
            .expect(400)
            .expect({
              error: { message: `Missing 'title' in request body` }
            })
        })

        it(`responds with 400 and an error message where the 'url' is missing`, () => {
          const newBookmark = {
            title: 'Test new bookmark',
            rating: 3
          }

          return supertest(app)
            .post('/bookmarks')
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .send(newBookmark)
            .expect(400)
            .expect({
              error: { message: `Missing 'url' in request body` }
            })
        })

        it(`responds with 400 and an error message where the 'rating' is missing`, () => {
          const newBookmark = {
            title: 'Test new bookmark',
            url: 'https://www.newtestbookmark.com'
          }

          return supertest(app)
            .post('/bookmarks')
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .send(newBookmark)
            .expect(400)
            .expect({
              error: { message: `Missing a rating between 1 and 5` }
            })
        })



        it(`responds with 400 and an error message where rating is not between 1 and 5`, () => {
          const newBookmark = {
            title: 'Test new bookmark',
            url: 'https://www.newtestbookmark.com',
            rating: 20
          }
          return supertest(app)
            .post('/bookmarks')
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .send(newBookmark)
            .expect(400, {
              error: { message: `Missing a rating between 1 and 5` }
            })
        })
      })

    describe(`GET /bookmarks/:id`, () => {
        context('Given no bookmarks', () => {
            it('responds with 404', () => {
                const bookmarkId = 123456
                return supertest(app)
                  .get(`/bookmarks/${bookmarkId}`)
                  .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                  .expect(404, { error: { message: `Bookmark doesn't exist` }})
            })
        })
        context('Given there are bookmarks in the database', () => {
          const testBookmarks = makeBookmarksArray()
    
          beforeEach('insert bookmarks', () => {
            return db
              .into('bookmarks')
              .insert(testBookmarks)
          })
    
          it('responds with 200 and the specified bookmark', () => {
            const bookmarkId = 2
            const expectedBookmark = testBookmarks[bookmarkId - 1]
            return supertest(app)
              .get(`/bookmarks/${bookmarkId}`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(200, expectedBookmark)
          })
        })

        context(`Given an XSS attack article`, () => {
          const maliciousBookmark = {
            id: 911,
            title: 'Naughty naughty very naughty <script>alert("xss");</script>',
            url: 'https://www.goofballboys.com',
            description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
            rating: 2
          }
          beforeEach('insert malicious bookmark', () => {
            return db
              .into('bookmarks')
              .insert([ maliciousBookmark ])
          })

          it('removes XSS attack content', () => {
            return supertest(app)
              .get(`/bookmarks/${maliciousBookmark.id}`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(200)
              .expect(res => {
                expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
                expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
              })
          })
      })
  })
  describe(`Delete /bookmarks/:bookmark_id`, () => {
    context('Given there are articles in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })
      it('responds with 204 and removes the article', () => {
        const idToRemove = 2
        const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
        return supertest(app)
          .delete(`/bookmarks/${idToRemove}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/bookmarks`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmarks)
          )
      })
    })
    context(`Given no articles`, () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456
        return supertest(app)
          .delete(`/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark doesn't exist`} })
      })
    })
  })
})
