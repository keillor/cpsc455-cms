const response = await fetch('/articles/published')
const articles = await response.json()

const news = document.querySelector('#news')
news.innerHTML = ejs.render(`
    <% for (const article of articles) { %>
      <aside>
        <h3><%= article.title %></h3>
        <p><%= article.body %></p>
        <p><small>
          Posted by <%= article.author %>
          at <%= article.dateline %>
        </small></p>
      </aside>
  <% } %>
`, { articles })
