# %%
import pandas as pd
import geopandas as gpd

import requests
import json

# %% query nodewatch
url = "https://nodewatch.chainsafe.io/query"
payload = json.dumps({"query": "query GetHeatmap {\n  getHeatmapData {\n    networkType\n    clientType\n    syncStatus\n    latitude\n    longitude\n  }\n}\n"})
headers = {'Content-Type': 'application/json'}
response = requests.request("POST", url, headers=headers, data=payload)
data = json.loads(response.text)
data = data['data']['getHeatmapData']
df = pd.DataFrame(data)

# %% reverse geocoding
world = gpd.read_file(gpd.datasets.get_path('naturalearth_lowres'))
gdf = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df.longitude, df.latitude))
result = gpd.sjoin(gdf, world, how='left')  # intersection between country shape, and location

# for nodes that "land in the ocean" or "on the beach" - just assign to nearest country
missing = result[pd.isnull(result['name'])]
missing_handle = gpd.sjoin_nearest(gdf.iloc[missing.index], world, how='left')
result.update(missing_handle)  # update records in original table

# check
missing = result[pd.isnull(result['name'])]
print(missing)

# %% export to json
countries = result.iso_a3.unique()
datamap = {c: 0 for c in countries}
result[['clientType', 'syncStatus', 'iso_a3']].to_json('../node_countries.json', orient='records')

# %% after processing in excel, covert excel to json for web public folder
web = pd.read_excel('./DataScraper.xlsx', ['country_data', 'node_countries'])
for j in web:
    web[j].to_json(f'../public/{j}.json', orient='records')
