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
      
            it('responds with 200 and all of the articles', () => {
              return supertest(app)
                .get('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200, testBookmarks)
            })
          })
    })
    describe(`GET /bookmarks/:id`, () => {
        context('Given no articles', () => {
            it('responds with 404', () => {
                const bookmarkId = 123456
                return supertest(app)
                  .get(`/bookmarks/${bookmarkId}`)
                  .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                  .expect(404, { error: { message: 'Bookmark Not Found' }})
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
      })
})