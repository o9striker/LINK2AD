const url = "https://youbae.in";
fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
  .then(res => res.json())
  .then(data => {
    console.log("Title:", data.data?.title);
    console.log("Desc:", data.data?.description);
    console.log("Image:", data.data?.image?.url);
  })
  .catch(console.error);
