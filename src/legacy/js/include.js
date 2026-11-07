// Liste der zu ladenden Include-Elemente
const includes = ["header", "footer"];

includes.forEach(id => {
  fetch(`/includes/${id}.html`)
    .then(res => {
      if (!res.ok) throw new Error(`Fehler beim Laden von ${id}.html`);
      return res.text();
    })
    .then(data => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = data;
    })
    .catch(err => console.error(err));
});
