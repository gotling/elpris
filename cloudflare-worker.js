const zone = 'SE3'
const fee = 0.083;
const vat = 1.25;
const timeZone = 2;

const daytime_start = 10;
const daytime_end = 18;
const daytime_price_max = 50;

export default {
  async fetch(request, env, ctx) {
    /**
     * Example someHost is set up to take in a JSON request
     * Replace url with the host you wish to send requests to
     * @param {string} url the URL to send the request to
     */
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    const url = `https://www.elprisetjustnu.se/api/v1/prices/${year}/${month}-${day}_${zone}.json`;

    /**
     * gatherResponse awaits and returns a response body as a string.
     * Use await gatherResponse(..) in an async function to get the response body
     * @param {Response} response
     */
    async function gatherResponse(response) {
      const { headers } = response;
      const contentType = headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return await response.json();
      }
      return response.text();
    }

    /**
     * @param {Array} rows
     */
    async function findExtremes(rows) {
      let lowest = rows[0]
      let highest = rows[0]
      let daytime;

      for (let row of rows) {
        let start = new Date(row['time_start'])
        start.setTime(start.getTime() + timeZone * 3600000)

        if (row['SEK_per_kWh'] >= highest['SEK_per_kWh'])
          highest = row
        if (row['SEK_per_kWh'] <= lowest['SEK_per_kWh'])
          lowest = row
        if ((start.getHours() >= daytime_start) && (start.getHours() <= daytime_end)) {
          if (daytime === undefined)
            daytime = row
          
          if (row['SEK_per_kWh'] <= daytime['SEK_per_kWh'])
            daytime = row
        }
      }

      for (let row of rows) {
        if (row['time_start'] === lowest['time_start'])
          row['state'] = 'lowest'
        if (row['time_start'] === highest['time_start'])
          row['state'] = 'highest'
        if (row['time_start'] === daytime['time_start'])
          row['state'] = 'daytime'
      }

      return rows;
    }

    /**
     * @param {Array} rows
     */
    async function modifyResponse(rows) {
      let result = []
      
      for (let row of rows) {
        let element = {};

        let start = new Date(row['time_start'])
        start.setTime(start.getTime() + timeZone * 3600000)

        element['hour'] = start.getHours();
        element['price'] = Math.round((row['SEK_per_kWh'] + fee) * vat * 100);
        element['state'] = row['state']
        
        result.push(element);
      }
      return result;
    }

    async function formatResponse(rows, format) {
      if (format == 'lowest_daytime') {
        let result = rows.find((element) => (element.state == 'daytime') && (element.price <= daytime_price_max));
        console.log(result)
        return result;
      }
    }  

    const init = {
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
      cf: {
        // Always cache this fetch regardless of content type
        // for a max of 5 seconds before revalidating the resource
        cacheTtl: 3600,
        cacheEverything: true,
      },
    };

    const { searchParams } = new URL(request.url)
    let format = searchParams.get('format')
    // highest, lowest, lowest_daytime

    const response = await fetch(url, init);
    let results = await gatherResponse(response);
    results = await findExtremes(results);
    let modified = await modifyResponse(results);

    if (format == 'lowest_daytime') {
      modified = await formatResponse(modified, format)
    }

    if (modified === undefined) {
      return new Response("", {status: 404})
    }

    return new Response(JSON.stringify(modified), init);
  },
};