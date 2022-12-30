import { React, useEffect, useState, useRef } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import highchartsMap from "highcharts/modules/map";
import mapDataWorld from "@highcharts/map-collection/custom/world-highres3.geo.json";
import DataTable from "react-data-table-component";
import { BarLoader } from "react-spinners";
import { Modal, Button } from "react-bootstrap";

const mapBaseOptions = {
  chart: {
    map: "topology",
    width: 1200,
    height: 900,
    animation: false,
  },
  title: {
    floating: true,
    text: "",
  },
  credits: {
    enabled: false,
  },
  mapNavigation: {
    enabled: true,
    buttonOptions: {
      align: "right",
      verticalAlign: "top",
    },
  },
  tooltip: {
    headerFormat: "",
    pointFormat: "Country: {point.name}<br> Nodes: {parseInt(point.value)}",
  },
  legend: {
    title: {
      text: "Ethereum Nodes",
      style: {
        color:
          // theme
          (Highcharts.DarkUnica && Highcharts.defaultOptions.legend && Highcharts.defaultOptions.legend.title && Highcharts.defaultOptions.legend.title.style && Highcharts.defaultOptions.legend.title.style.color) || "black",
      },
    },
  },
  colorAxis: {
    min: 1,
    max: 1000,
    minColor: "#ffffff",
    maxColor: "#0000ff",
    type: "logarithmic",
  },
  series: [
    {
      name: "Basemap",
      mapData: mapDataWorld,
      borderColor: "#707070",
      nullColor: "rgba(255, 0, 0, 0.2)",
      showInLegend: false,
    },
  ],
};

const dataTableCols = [
  {
    name: "Country",
    selector: (row) => row["Country Name"],
    sortable: true,
    compact: true,
    center: true,
  },
  {
    name: "Value",
    selector: (row) => row["value"],
    sortable: true,
    compact: true,
    defaultSortAsc: true,
    center: true,
  },
];

const App = () => {
  const [nodeData, setNodeData] = useState([]);
  const [countryData, setCountryData] = useState([]);
  const [mapOptions, setMapOptions] = useState(mapBaseOptions);
  const [dataLoading, setLoading] = useState(true);
  const [mapType, setMapType] = useState(0);
  const [tableData, setTableData] = useState([]);

  const [filterClients, setFilterClients] = useState([]);
  const [filterSyncStatus, setFilterSyncStatus] = useState([]);

  const chartComponent = useRef();

  const [showModal, setShowModal] = useState(false);
  const [showModalCaveats, setShowModalCaveats] = useState(false);

  // on load get data
  useEffect(() => {
    getData();
  }, []);

  // trigger map update if map type changes
  useEffect(() => {
    updateMap();
  }, [mapType]);

  // redraw map if map options change
  useEffect(() => {
    const chart = chartComponent.current?.chart;
    if (chart) {
      chart.redraw();
    }
  }, [mapOptions]);

  // get data functions
  const getData = async () => {
    await getNodeData();
    await getCountryData();
    setMapType(1);
    setLoading(false);
  };

  const getNodeData = async () => {
    let res = await fetch("./node_countries.json");
    let data = await res.json();
    setNodeData(data);
    return data;
  };

  const getCountryData = async () => {
    let res = await fetch("./country_data.json");
    let data = await res.json();
    setCountryData(data);
    return data;
  };

  // preprocessing
  const preprocessData = () => {
    let data = nodeData.filter(() => true); // todo: future filtering
    let nodeCount = {};
    data.map((n) => {
      nodeCount[n.countryCode] = nodeCount[n.countryCode] + n.Count || n.Count;
    }, {});
    let output = countryData.map((c) => {
      return { ...c, nodes: nodeCount[c.countryCode] ?? 0 }; // note world bank does not recognise taiwan as a country
    });
    return output;
  };

  function getStandardDeviation(array) {
    const n = array.length;
    const mean = array.reduce((a, b) => a + b) / n;
    return Math.sqrt(array.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
  }

  const updateMap = async () => {
    let chartData = preprocessData();
    if (mapType == 1) {
      //// 1 -------------------------------------------------------------------------------------
      chartData = chartData.map((d) => {
        return { ...d, value: d.nodes };
      });
      let newMapOptions = { ...mapBaseOptions };
      chartData = chartData.filter((c) => c.value > 0); // drop zeros otherwise log scale breaks
      newMapOptions.series = [
        {
          data: chartData,
          joinBy: ["iso-a3", "countryCode"],
          name: "Nodes",
          states: {
            hover: {
              color: "#ffa000",
            },
          },
        },
      ];
      let scaleMax = Math.max(...chartData.map((d) => d.value || 0));
      newMapOptions.colorAxis.min = 1;
      newMapOptions.colorAxis.max = scaleMax;
      newMapOptions.colorAxis.minColor = "#ffffff";
      newMapOptions.colorAxis.maxColor = "#0000ff";
      newMapOptions.colorAxis.stops = undefined;
      newMapOptions.legend.title.text = "Nodes";
      newMapOptions.colorAxis.type = "logarithmic";
      newMapOptions.tooltip.pointFormat = "Country: {point.name}<br> Nodes: {point.value}";
      setMapOptions(newMapOptions);
    } else if (mapType == 2) {
      //// 2 -------------------------------------------------------------------------------------
      chartData = chartData.map((c) => {
        return { ...c, value: c.gdp < 1 ? 1 : c.gdp };
      });
      let newMapOptions = { ...mapBaseOptions };
      chartData = chartData.filter((c) => c.value > 0); // drop zeros otherwise log scale breaks
      newMapOptions.series = [
        {
          data: chartData,
          joinBy: ["iso-a3", "countryCode"],
          name: "GDP",
          states: {
            hover: {
              color: "#ffa000",
            },
          },
        },
      ];
      let scaleMax = Math.max(...chartData.map((d) => d.value || 0));
      newMapOptions.colorAxis.min = 1;
      newMapOptions.colorAxis.max = scaleMax;
      newMapOptions.colorAxis.minColor = "#ffffff";
      newMapOptions.colorAxis.maxColor = "#0000ff";
      newMapOptions.colorAxis.stops = undefined;
      newMapOptions.legend.title.text = "GDP (Billions USD)";
      newMapOptions.colorAxis.type = "logarithmic";
      newMapOptions.tooltip.pointFormat = "Country: {point.name}<br> GDP: {point.value} $bn USD";
      setMapOptions(newMapOptions);
    } else if (mapType == 3) {
      //// 3 -------------------------------------------------------------------------------------
      chartData = chartData.map((c) => {
        return { ...c, value: c.landArea < 1 ? 1 : c.landArea };
      });
      let newMapOptions = { ...mapBaseOptions };
      chartData = chartData.filter((c) => c.value > 0); // drop zeros otherwise log scale breaks
      newMapOptions.series = [
        {
          data: chartData,
          joinBy: ["iso-a3", "countryCode"],
          name: "Land Area",
          states: {
            hover: {
              color: "#ffa000",
            },
          },
        },
      ];
      let scaleMax = Math.max(...chartData.map((d) => d.value || 0));
      newMapOptions.colorAxis.min = 1;
      newMapOptions.colorAxis.max = scaleMax;
      newMapOptions.colorAxis.minColor = "#ffffff";
      newMapOptions.colorAxis.maxColor = "#0000ff";
      newMapOptions.colorAxis.stops = undefined;
      newMapOptions.legend.title.text = "Land Area (km²)";
      newMapOptions.colorAxis.type = "logarithmic";
      newMapOptions.tooltip.pointFormat = "Country: {point.name}<br> Land Area: {point.value} km²";
      setMapOptions(newMapOptions);
    } else if (mapType == 4) {
      //// 4 -------------------------------------------------------------------------------------
      chartData = chartData.map((c) => {
        return { ...c, value: c.population < 1 ? 1 : c.population };
      });
      let newMapOptions = { ...mapBaseOptions };
      chartData = chartData.filter((c) => c.value > 0); // drop zeros otherwise log scale breaks
      newMapOptions.series = [
        {
          data: chartData,
          joinBy: ["iso-a3", "countryCode"],
          name: "Population",
          states: {
            hover: {
              color: "#ffa000",
            },
          },
        },
      ];
      let scaleMax = Math.max(...chartData.map((d) => d.value || 0));
      newMapOptions.colorAxis.min = 1;
      newMapOptions.colorAxis.max = scaleMax;
      newMapOptions.colorAxis.minColor = "#ffffff";
      newMapOptions.colorAxis.maxColor = "#0000ff";
      newMapOptions.colorAxis.stops = undefined;
      newMapOptions.legend.title.text = "Population";
      newMapOptions.colorAxis.type = "logarithmic";
      newMapOptions.tooltip.pointFormat = "Country: {point.name}<br> Population: {point.value}";
      setMapOptions(newMapOptions);
    } else if (mapType == 5) {
      //// 5 -------------------------------------------------------------------------------------
      chartData = chartData.map((c) => {
        return { ...c, value: (c.nodes / c.gdp) * 1e3 };
      });
      let newMapOptions = { ...mapBaseOptions };
      chartData = chartData.filter((c) => c.value > 0); // drop zeros otherwise log scale breaks
      newMapOptions.series = [
        {
          data: chartData,
          joinBy: ["iso-a3", "countryCode"],
          name: "",
          states: {
            hover: {
              color: "#ffa000",
            },
          },
        },
      ];
      let scaleMax = Math.max(...chartData.map((d) => d.value || 0));
      newMapOptions.colorAxis.min = 1;
      newMapOptions.colorAxis.max = scaleMax;
      newMapOptions.colorAxis.minColor = "#ffffff";
      newMapOptions.colorAxis.maxColor = "#0000ff";
      newMapOptions.colorAxis.stops = undefined;
      newMapOptions.legend.title.text = "Nodes per $trillion USD GDP";
      newMapOptions.colorAxis.type = "logarithmic";
      newMapOptions.tooltip.pointFormat = "Country: {point.name}<br> Value: {point.value}";
      setMapOptions(newMapOptions);
    } else if (mapType == 6) {
      //// 6 -------------------------------------------------------------------------------------
      chartData = chartData.map((c) => {
        return { ...c, value: (c.nodes / c.landArea) * 1e6 };
      });
      let newMapOptions = { ...mapBaseOptions };
      chartData = chartData.filter((c) => c.value > 0); // drop zeros otherwise log scale breaks
      newMapOptions.series = [
        {
          data: chartData,
          joinBy: ["iso-a3", "countryCode"],
          name: "",
          states: {
            hover: {
              color: "#ffa000",
            },
          },
        },
      ];
      let scaleMax = Math.max(...chartData.map((d) => d.value || 0));
      newMapOptions.colorAxis.min = 1;
      newMapOptions.colorAxis.max = scaleMax;
      newMapOptions.colorAxis.minColor = "#ffffff";
      newMapOptions.colorAxis.maxColor = "#0000ff";
      newMapOptions.colorAxis.stops = undefined;
      newMapOptions.legend.title.text = "Nodes per 1,000,000 km²";
      newMapOptions.colorAxis.type = "logarithmic";
      newMapOptions.tooltip.pointFormat = "Country: {point.name}<br> Value: {point.value}";
      setMapOptions(newMapOptions);
    } else if (mapType == 7) {
      //// 7 -------------------------------------------------------------------------------------
      chartData = chartData.map((c) => {
        return { ...c, value: (c.nodes / c.population) * 1e6 };
      });
      let newMapOptions = { ...mapBaseOptions };
      chartData = chartData.filter((c) => c.value > 0); // drop zeros otherwise log scale breaks
      newMapOptions.series = [
        {
          data: chartData,
          joinBy: ["iso-a3", "countryCode"],
          name: "",
          states: {
            hover: {
              color: "#ffa000",
            },
          },
        },
      ];
      let scaleMax = Math.max(...chartData.map((d) => d.value || 0));
      newMapOptions.colorAxis.min = 1;
      newMapOptions.colorAxis.max = scaleMax;
      newMapOptions.colorAxis.minColor = "#ffffff";
      newMapOptions.colorAxis.maxColor = "#0000ff";
      newMapOptions.colorAxis.stops = undefined;
      newMapOptions.legend.title.text = "Nodes per 1,000,000 people";
      newMapOptions.colorAxis.type = "logarithmic";
      newMapOptions.tooltip.pointFormat = "Country: {point.name}<br> Value: {point.value}";
      setMapOptions(newMapOptions);
    } else if (mapType == 8) {
      //// 8 -------------------------------------------------------------------------------------
      chartData = chartData.map((c) => {
        return { ...c, value: (c.nodes / c.gdp) * 1e3 };
      });
      // mean and stdev
      let valueArray = chartData.map((c) => c.value);
      let mean = valueArray.reduce((a, b) => a + b, 0) / valueArray.length;
      let stdev = getStandardDeviation(valueArray);
      // build metric
      chartData = chartData.map((c) => {
        return { ...c, value: (c.value - mean) / stdev };
      });
      let newMapOptions = { ...mapBaseOptions };
      newMapOptions.series = [
        {
          data: chartData,
          joinBy: ["iso-a3", "countryCode"],
          name: "",
          states: {
            hover: {
              color: "#ffa000",
            },
          },
        },
      ];
      newMapOptions.colorAxis.min = -1;
      newMapOptions.colorAxis.max = 1;
      newMapOptions.colorAxis.minColor = undefined;
      newMapOptions.colorAxis.maxColor = undefined;
      newMapOptions.colorAxis.stops = [
        [0, "#ff0000"],
        [0.35, "#ff0000"],
        [0.5, "#ffffff"],
        [1, "#0000ff"],
      ];
      newMapOptions.legend.title.text = "Nodes per $trillion USD GDP - number of stdevs from mean";
      newMapOptions.colorAxis.type = "linear";
      newMapOptions.tooltip.pointFormat = "Country: {point.name}<br> #Std Dev from mean: {point.value}";
      setMapOptions(newMapOptions);
    } else if (mapType == 9) {
      //// 9 -------------------------------------------------------------------------------------
      chartData = chartData.map((c) => {
        return { ...c, value: (c.nodes / c.landArea) * 1e6 };
      });
      // mean and stdev
      let valueArray = chartData.map((c) => c.value);
      let mean = valueArray.reduce((a, b) => a + b, 0) / valueArray.length;
      let stdev = getStandardDeviation(valueArray);
      // build metric
      chartData = chartData.map((c) => {
        return { ...c, value: (c.value - mean) / stdev };
      });
      let newMapOptions = { ...mapBaseOptions };
      newMapOptions.series = [
        {
          data: chartData,
          joinBy: ["iso-a3", "countryCode"],
          name: "",
          states: {
            hover: {
              color: "#ffa000",
            },
          },
        },
      ];
      newMapOptions.colorAxis.min = -1;
      newMapOptions.colorAxis.max = 1;
      newMapOptions.colorAxis.minColor = undefined;
      newMapOptions.colorAxis.maxColor = undefined;
      newMapOptions.colorAxis.stops = [
        [0, "#ff0000"],
        [0.35, "#ff0000"],
        [0.5, "#ffffff"],
        [1, "#0000ff"],
      ];
      newMapOptions.legend.title.text = "Nodes per 1,000,000 km² - number of stdevs from mean";
      newMapOptions.colorAxis.type = "linear";
      newMapOptions.tooltip.pointFormat = "Country: {point.name}<br> #Std Dev from mean: {point.value}";
      setMapOptions(newMapOptions);
    } else if (mapType == 10) {
      //// 10 -------------------------------------------------------------------------------------
      chartData = chartData.map((c) => {
        return { ...c, value: (c.nodes / c.population) * 1e6 };
      });
      // mean and stdev
      let valueArray = chartData.map((c) => c.value);
      let mean = valueArray.reduce((a, b) => a + b, 0) / valueArray.length;
      let stdev = getStandardDeviation(valueArray);
      // build metric
      chartData = chartData.map((c) => {
        return { ...c, value: (c.value - mean) / stdev };
      });
      let newMapOptions = { ...mapBaseOptions };
      newMapOptions.series = [
        {
          data: chartData,
          joinBy: ["iso-a3", "countryCode"],
          name: "",
          states: {
            hover: {
              color: "#ffa000",
            },
          },
        },
      ];
      newMapOptions.colorAxis.min = -1;
      newMapOptions.colorAxis.max = 1;
      newMapOptions.colorAxis.minColor = undefined;
      newMapOptions.colorAxis.maxColor = undefined;
      newMapOptions.colorAxis.stops = [
        [0, "#ff0000"],
        [0.35, "#ff0000"],
        [0.5, "#ffffff"],
        [1, "#0000ff"],
      ];
      newMapOptions.legend.title.text = "Nodes per 1,000,000 people - number of stdevs from mean";
      newMapOptions.colorAxis.type = "linear";
      newMapOptions.tooltip.pointFormat = "Country: {point.name}<br> #Std Dev from mean: {point.value}";
      setMapOptions(newMapOptions);
    }
    chartData.sort((a, b) => (a.value < b.value ? 1 : -1));
    setTableData(chartData);
  };

  const handleSetMapType = (n) => {
    setMapType(n);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  const handleCloseCaveats = () => {
    setShowModalCaveats(false);
  };

  highchartsMap(Highcharts);

  return (
    <>
      <div className="container-fluid m-0 p-0">
        <div className="row py-3 bg-dark">
          <div className="col m-0 p-0">
            <div className="d-flex flex-row gap-3 text-white justify-content-center align-items-center flex-nowrap">
              <div className={`btn btn-sm ${mapType == 1 ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => handleSetMapType(1)}>
                <i className="fa-brands fa-ethereum"></i> Nodes
              </div>
              <div className="d-flex flex-row gap-3 text-white justify-content-center align-items-center flex-nowrap">
                <div>Country Stats:</div>{" "}
                <div className={`btn btn-sm ${mapType == 2 ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => handleSetMapType(2)}>
                  GDP
                </div>
                <div className={`btn btn-sm ${mapType == 3 ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => handleSetMapType(3)}>
                  Land
                </div>
                <div className={`btn btn-sm ${mapType == 4 ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => handleSetMapType(4)}>
                  Population
                </div>
              </div>
              <div className="d-flex flex-row gap-3 text-white justify-content-center align-items-center flex-nowrap">
                <div className="text-nowrap">Node Density:</div>{" "}
                <div className={`btn btn-sm ${mapType == 5 ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => handleSetMapType(5)}>
                  Nodes/GDP
                </div>
                <div className={`btn btn-sm ${mapType == 6 ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => handleSetMapType(6)}>
                  Nodes/Land
                </div>
                <div className={`btn btn-sm ${mapType == 7 ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => handleSetMapType(7)}>
                  Nodes/Population
                </div>
              </div>
              <div className="d-flex flex-row gap-3 text-white justify-content-center align-items-center flex-nowrap">
                <div className="text-nowrap">Node Density Z-Score </div>
                <a href="#" onClick={() => setShowModal(true)}>
                  <i className="fa-regular fa-circle-question"></i>
                </a>
              </div>{" "}
              <div className={`btn btn-sm ${mapType == 8 ? "btn-secondary" : "btn-outline-secondary"} text-nowrap`} onClick={() => handleSetMapType(8)}>
                Nodes-GDP
              </div>
              <div className={`btn btn-sm ${mapType == 9 ? "btn-secondary" : "btn-outline-secondary"} text-nowrap`} onClick={() => handleSetMapType(9)}>
                {" "}
                Nodes-Land
              </div>
              <div className={`btn btn-sm ${mapType == 10 ? "btn-secondary" : "btn-outline-secondary"} text-nowrap`} onClick={() => handleSetMapType(10)}>
                Nodes-Population
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container-fluid">
        <div className="row pt-3">
          <div className="col d-flex flex-col justify-content-center">
            <h5>Ethereum Node Decentralization Stats Map</h5>
          </div>
        </div>
        <div className="row">
          <div className="col d-flex flex-col justify-content-center">
            <i>
              Source:{" "}
              <a href="https://www.nodewatch.io/" target="_blank">
                Nodewatch.io
              </a>
              ,{" "}
              <a href="https://data.worldbank.org/" target="_blank">
                World Bank
              </a>{" "}
              (Data is not live, last Updated: 2022-12-30 UTC)
            </i>
          </div>
        </div>
        <div className="row pt-2">
          <div className="col text-center">
            <div
              className="btn btn-sm btn-outline-danger"
              onClick={() => {
                setShowModalCaveats(true);
              }}
            >
              Assumptions and Notes
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col d-flex justify-content-center align-middle">
            {dataLoading ? (
              <div className="py-5">
                <BarLoader />
              </div>
            ) : (
              <HighchartsReact ref={chartComponent} constructorType={"mapChart"} highcharts={Highcharts} options={mapOptions} />
            )}
          </div>
        </div>
      </div>

      <div className="container" style={{ maxWidth: "600px" }}>
        <div className="row">
          <div className="col">
            <DataTable columns={dataTableCols} data={tableData} progressPending={dataLoading} keyField="Country" dense striped highlightOnHover pagination></DataTable>
          </div>
        </div>
      </div>

      <div className="container-fluid">
        <div className="row">
          <div className="col text-center">
            <div>Made without permissions 😊 (permissionless) </div>
            <br></br>
            <div className="btn-group">
              <button className="btn btn-sm btn-outline-dark dropdown-toggle" type="button" data-bs-toggle="dropdown">
                0xHodja.eth
              </button>
              <ul className="dropdown-menu p-1" style={{ minWidth: "100px" }}>
                <li>
                  <a href="https://twitter.com/hodjatweet" className="dropdown-item small" target="_blank" rel="noreferrer">
                    <i className="fa-brands fa-twitter text-primary"></i> Twitter
                  </a>
                </li>
                <li>
                  <a href="https://etherscan.io/address/0xhodja.eth" className="dropdown-item small" target="_blank" rel="noreferrer">
                    <i className="fa fa-coffee text-primary"></i> Tip
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Modal show={showModal} onHide={handleClose} centered>
        <Modal.Body>
          <p>
            <b>Node Density Z-Score: </b>
          </p>
          <ul>
            <li>takes the respective Node Density measure</li>
            <li>calculates the mean and standard deviation of that</li>
            <li>finds the respective country's difference with the mean</li>
            <li>then divides it by the standard deviation</li>
          </ul>
          It intends to provide a metric to show whether a country is above or below the average in terms of the distribution.
        </Modal.Body>
      </Modal>

      <Modal show={showModalCaveats} onHide={handleCloseCaveats} centered>
        <Modal.Body>
          <p>
            <b>Assumptions and Caveats</b>
          </p>
          <ul>
            <li>This is primarily intended to be informative, and not an insanely precise analysis</li>
            <li>Data is only as accurate as the geocoding of IP addresses allows</li>
            <li>Some datacenters operate many nodes, so there may be inaccuracies drawing conclusions about where the node operators live</li>
            <li>World Bank unfortunately does not recognise some countries like Taiwan, so when joining the data there are some discrepancies e.g. Taiwanese nodes are not plotted as a result</li>
            <li>Reverse geocoding was done with the python library "geopandas" on "naturalearth_lowres" which may differ slightly to other geocoding shapefiles</li>
            <li>Data is just a static snapshot in time</li>
          </ul>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default App;
