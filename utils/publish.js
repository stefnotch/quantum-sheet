import ghpages from "gh-pages";

ghpages.publish("dist", { history: false, dotfiles: true }, (err) => {
  if (err) console.error(err);
  else console.log("Published to GitHub");
});
