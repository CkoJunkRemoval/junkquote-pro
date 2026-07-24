# Route Intelligence ZIP centroid data

Route Intelligence does not geocode at runtime. Exact property coordinates win;
otherwise the application checks a compact local ZIP lookup and then falls back
to city/state or fixed-buffer assumptions.

The development fixture was derived from the U.S. Census Bureau 2024 National
ZIP Code Tabulation Area Gazetteer file:

`https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_zcta_national.zip`

U.S. Census Bureau data is a U.S. government work. The Gazetteer contains ZCTA
representative internal points, not rooftop locations or USPS delivery ZIP
centroids. Production population should download and extract the tab-delimited
file, then run:

`node scripts/import-zip-centroids.mjs <input.txt> <output.json>`

Keep the generated lookup outside the client bundle and update the source and
version metadata whenever the Gazetteer vintage changes.
