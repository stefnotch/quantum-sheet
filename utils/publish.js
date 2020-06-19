import ghpages from "gh-pages";

ghpages.publish("dist", { history: false }, (err) => {
  if (err) console.error(err);
  else console.log("Published to GitHub");
});
