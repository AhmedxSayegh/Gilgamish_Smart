
const apiKey = process.env.TAVILY_API_KEY;

if (!apiKey) {
  console.error("TAVILY_API_KEY is missing!");
  process.exit(1);
}

async function testTavily() {
  try {
    console.log("Searching for Louvre Museum admission price...\n");

    const response = await fetch(
      "https://api.tavily.com/search",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query:
            "Louvre Museum official adult non EEA visitor admission ticket price November 2026 site:louvre.fr",
          search_depth: "basic",
          max_results: 5,
          include_answer: false,
          include_raw_content: false,
          include_domains: ["louvre.fr"]
        }),
        signal: AbortSignal.timeout(20000)
      }
    );

    if (!response.ok) {
      console.error(
        "Tavily API Error:",
        response.status,
        response.statusText
      );
      return;
    }

    const data = await response.json();

    console.log("SEARCH RESULTS:\n");

    if (!data.results?.length) {
      console.log("No results found.");
      return;
    }

    for (const [index, result] of data.results.entries()) {
      console.log(`\nRESULT ${index + 1}`);
      console.log("Title:", result.title);
      console.log("URL:", result.url);
      console.log("Content:", result.content);
      console.log("--------------------");
    }

    console.log(
      "\nTotal results:",
      data.results.length
    );

  } catch (error) {
    console.error("Error:", error.message);
  }
}

testTavily();
