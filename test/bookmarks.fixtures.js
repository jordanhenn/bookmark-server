function makeBookmarksArray() {
    return [
      {
        id: 1,
        title: 'Goofball Boys',
        url: 'https://www.goofballboys.com',
        description: 'A wesbite for the goofball boys.',
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
      },
      {
        id: 4,
        title: 'Janet Jackson',
        url: 'https://www.janetjackson.com',
        description: `Janet Jackson's personal website.`,
        rating: 1
      },
    ];
  }
  
  module.exports = {
    makeBookmarksArray,
  }