const navHeader = require('./data/navHeader.json');

module.exports = {
  async rewrites() {
    // build rewrites only for known top-level category slugs (subTitle or id)
    const routes = (Array.isArray(navHeader) ? navHeader : []).map((cat) => {
      const slug = cat.subTitle || cat.id || '';
      return {
        source: `/${slug}/:sub`,
        destination: `/category/${encodeURIComponent(slug)}/:sub`,
      };
    });

    return routes;
  },
};
