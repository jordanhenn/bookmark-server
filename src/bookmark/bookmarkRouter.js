const path = require('path')
const express = require('express')
const xss = require('xss')
const { v4: uuid } = require('uuid')
const { bookmarks } = require('../store')
const BookmarksService = require('../bookmarks-service')

const bookmarkRouter = express.Router()
const bodyParser = express.json()

const serializeBookmark = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: xss(bookmark.url),
  description: xss(bookmark.description),
  rating: bookmark.rating
})

bookmarkRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks.map(serializeBookmark))
      })
      .catch(next)
  })
  .post(bodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db')
    const { title, url, rating, description } = req.body;
    const newBookmark = { title, url, rating, description }
    if (!title) {
      return res.status(400).json({
        error: { message: `Missing 'title' in request body`}
      })
    }

    if (!url) {
      return res.status(400).json({
        error: { message: `Missing 'url' in request body`}
      })
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: { message: `Missing a rating between 1 and 5`}
      })
    }

    for (const [key, value] of Object.entries(newBookmark)) {
          newBookmark[key] = xss(value)
  }
    BookmarksService.insertBookmark(
      knexInstance,
      newBookmark
    )
    .then(bookmark => {
      res
      .status(201)
      .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
      .json(bookmark)
    })
    .catch(next)
  })

bookmarkRouter
  .route('/bookmarks/:id')
  .all((req, res, next) => {
    BookmarksService.getById(
        req.app.get('db'),
        req.params.id
    )
    .then(bookmark => {
        if (!bookmark) {
            return res.status(404).json({
                error: { message: `Bookmark doesn't exist`}
            })
        }
        res.bookmark = bookmark
        next()
    })
    .catch(next)
})
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    const { id } = req.params;
    BookmarksService.getById(knexInstance, id)
      .then(bookmark => {
        res.json({
          id: res.bookmark.id,
          url: xss(res.bookmark.url),
          title: xss(res.bookmark.title),
          description: xss(res.bookmark.description),
          rating: (res.bookmark.rating)
      })
  })
})
  .delete((req, res, next) => {
    const { id } = req.params
    const knexInstance = req.app.get('db')
    BookmarksService.deleteBookmark(
      knexInstance,
      id
    )
      .then(() => {
        res
        .status(204)
        .end()
      })
      .catch(next)
  })
  .patch(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body
    const bookmarkToUpdate = { title, url, description, rating }
    const knexInstance = req.app.get('db')

    const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain either 'title', 'url', 'description' or 'rating'`
        }
      })
    }
    BookmarksService.updateBookmark(
      knexInstance,
      req.params.id,
      bookmarkToUpdate
    )
    //ask jeremy about this
    .then(numRowsAffected => {
      res.status(204).end()
    })
    .catch(next)
  })

module.exports = bookmarkRouter