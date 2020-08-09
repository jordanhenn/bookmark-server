const express = require('express')
const { v4: uuid } = require('uuid')
const { bookmarks } = require('../store')
const BookmarksService = require('../bookmarks-service')

const bookmarkRouter = express.Router()
const bodyParser = express.json()

bookmarkRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks)
      })
      .catch(next)
  })
  .post(bodyParser, (req, res) => {
    const { title, url, rating, desc } = req.body;

    if (!title) {
        return res
            .status(400)
            .send('Invalid data');
    }

    if (!url) {
        return res
            .status(400)
            .send('Invalid data');
    }

    if (!rating) {
        return res
            .status(400)
            .send('Invalid data');
    }

    if (!desc) {
        return res
            .status(400)
            .send('Invalid data');
    }

    const id = uuid();

    const bookmark = {
        id,
        title,
        url,
        rating,
        desc
    };

    bookmarks.push(bookmark);

    res
    .status(201)
    .location(`http://localhost:8000/bookmarks/${id}`)
    .json({bookmark});
  })

bookmarkRouter
  .route('/bookmarks/:id')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    const { id } = req.params;
    BookmarksService.getById(knexInstance, id)
      .then(bookmark => {
        if (!bookmark) {
          return res
              .status(404)
              .send({ error: { message: 'Bookmark Not Found' }});
        }
        res.json(bookmark)
      })
      .catch(next)
  })
  .delete((req, res) => {
    const { id } = req.params;

    const bookmarkIndex = bookmarks.findIndex(bm => bm.id === id);

    if (bookmarkIndex === -1) {
        return res
            .status(404)
            .send('Not found');
    }

    bookmarks.splice(bookmarkIndex, 1);

    res
        .status(204)
        .end();
  })

module.exports = bookmarkRouter