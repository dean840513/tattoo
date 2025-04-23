async function renderNFTs() {
    try {
      const response = await fetch('listings.json');
      if (!response.ok) throw new Error("Network response was not ok");
      const listings = await response.json();
  
      const container = document.getElementById("nftGrid");
      container.innerHTML = "";
      listings.forEach(function (nft) {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <img src="${nft.image}