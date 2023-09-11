const latLongMap = {
  BOM: {
    lat: 19.090223,
    long: 72.8602338,
  },
  HYD: {
    lat: 17.2353303,
    long: 78.4312999,
  },
  DEL: {
    lat: 28.5566842,
    long: 77.0980399,
  },
  BLR: {
    lat: 13.1989141,
    long: 77.7042382,
  },
  CCU: {
    lat: 22.6419591,
    long: 88.4358809,
  },
  MAA: {
    lat: 12.981112,
    long: 80.1570481,
  },
};

const airportName = {
  BOM: "Mumbai Airport",
  BLR: "Bengaluru Airport",
  CCU: "Kolkata Airport",
  MAA: "Chennai Airport",
  HYD: "Hyderbad Airport",
  DEL: "Delhi Airport",
};

const flightOptions = ["BOM", "BLR", "CCU", "MAA", "HYD", "DEL"];

let airlineOptions = [];

// D3 library - D3 DSV: This function is used to parse csv file rows to json objects.
const parseRows = ([
  origin,
  destination,
  company,
  departureTime,
  arrivalTime,
  duration,
  flightPrice,
  date,
  cabinClass,
]) => ({
  origin,
  destination,
  company,
  departureTime,
  arrivalTime,
  duration,
  flightPrice,
  date,
  cabinClass,
  originLat: latLongMap[origin]?.lat,
  originLong: latLongMap[origin]?.long,
  destLat: latLongMap[destination]?.lat,
  destLong: latLongMap[destination]?.long,
});

// // let globe;
// let filghts;
// let globeData;
// let globePointData;
// let scales;
// let bombay;

// Get largest number of flights from a single origin
let min = Infinity;
let max = 0;

// Default options for color schems to display in colorscheme filter
const d3ColorSchemes = [
  "interpolateBlues",
  "interpolateBrBG",
  "interpolateBuGn",
  "interpolateBuPu",
  "interpolateCividis",
  "interpolateCool",
  "interpolateCubehelixDefault",
  "interpolateGnBu",
  "interpolateGreens",
  "interpolateGreys",
  "interpolateInferno",
  "interpolateMagma",
  "interpolateOrRd",
  "interpolateOranges",
  "interpolatePRGn",
  "interpolatePiYG",
  "interpolatePlasma",
  "interpolatePuBu",
  "interpolatePuBuGn",
  "interpolatePuOr",
  "interpolatePuRd",
  "interpolatePurples",
  "interpolateRainbow",
  "interpolateRdBu",
  "interpolateRdGy",
  "interpolateRdPu",
  "interpolateRdYlBu",
  "interpolateRdYlGn",
  "interpolateReds",
  "interpolateSinebow",
  "interpolateSpectral",
  "interpolateTurbo",
  "interpolateViridis",
  "interpolateWarm",
  "interpolateYlGn",
  "interpolateYlGnBu",
  "interpolateYlOrBr",
  "interpolateYlOrRd",
];

// Airline filter variable
let airlineController;

// All filters with default values
const options = {
  rotateGlobe: true,
  globeRotationSpeed: 0.25,
  showAirportFlightFrequency: true,
  animateFlights: true,
  flightArcDiameter: null,
  scale: "symlog",
  useLogScale: true,
  altitudeScaleFactor: 0.25,
  colorScheme: "interpolateWarm",
  destination: "BOM",
  airline: "All",
};

// This function returns all the arrivals to destination airport
const getflightsDataBinned = (flights) => {
  const flightsDataBinned = flights.reduce((acc, flight) => {
    if (acc[flight.origin]) {
      acc = {
        ...acc,
        [flight.origin]: {
          ...acc[flight.origin],
          arrivals: [...acc[flight.origin].arrivals, flight],
        },
      };
    } else {
      acc = {
        ...acc,
        [flight.origin]: {
          arrivals: [flight],
          pos: {
            lat: latLongMap[flight.origin].lat,
            lng: latLongMap[flight.origin].long,
          },
          airportName: airportName[flight.origin],
        },
      };
    }

    return acc;
  }, {});

  return flightsDataBinned;
};

// This returns the globe/arcs data we want to render on the globe.
const getGlobeData = (flightDataBinned, bombay) => {
  return Object.keys(flightDataBinned).map((el) => {
    const flightCount = flightDataBinned[el].arrivals.length;

    return {
      flightCount: flightCount,
      arrivals: flightDataBinned[el].arrivals,
      airport: el,
      startLat: parseFloat(flightDataBinned[el].pos.lat),
      startLng: parseFloat(flightDataBinned[el].pos.lng),
      endLat: parseFloat(bombay.lat),
      endLng: parseFloat(bombay.long),
      color: flightCount,
      label: `<strong>${flightDataBinned[el].airportName} --> ${
        airportName[options.destination]
      }</strong><br><em>${flightCount} flights</em>`,
    };
  });
};

// This function use the previously calculated globe data to render data points/bars on the globe
const getPointsData = (globeData) => {
  return globeData.map((el) => {
    const { startLat, startLng, label, flightCount } = el;

    return {
      lat: startLat,
      lng: startLng,
      color: flightCount,
      altitude: flightCount,
      label,
      flightCount,
    };
  });
};

// This function calculates the min and max values using flight arrivals to destination
const getMinMax = (flightsDataBinned) => {
  let min = Infinity;
  let max = 0;

  Object.keys(flightsDataBinned).forEach((el) => {
    if (flightsDataBinned[el].arrivals.length > max)
      max = flightsDataBinned[el].arrivals.length;
    if (flightsDataBinned[el].arrivals.length < min) {
      min = flightsDataBinned[el].arrivals.length;
    }
  });

  return { min, max };
};

// The execution will start here. When all the libraries are available. This listener will execute and it will start loading the data initially.
document.addEventListener("DOMContentLoaded", async () => {
  // Create a Dat GUI containers to show filters
  const guiContainer = document.getElementById("gui");
  const gui = new dat.GUI({
    name: "Air Traffic Globe",
    autoPlace: false,
    closeOnTop: true,
  });

  guiContainer.appendChild(gui.domElement);
  let datguiEl = document.getElementById("gui");

  const guiGlobe = gui.addFolder("Globe");
  guiGlobe.open();
  const guiAirports = gui.addFolder("Airports");
  guiAirports.open();
  const guiFlights = gui.addFolder("Flights");
  guiFlights.open();

  // DOM Elements
  const descriptionEl = document.getElementById("description");
  const legendEl = document.getElementById("legend");

  const colorScheme = (scheme) => d3[scheme];

  // Initial function to execute. To render the globe first time with BOM as default.
  async function loadGlobe() {
    const flights = await loadFlights();
    const bombay = latLongMap[options.destination];

    // Filter the flights according to destination and airline. If airline filter is All that means we need to show all the companies.
    const filteredFlights = flights.filter((item) => {
      return (
        options.destination.toLowerCase() === item.destination.toLowerCase() &&
        (options.airline === "All"
          ? true
          : options.airline.toLowerCase() === item.company.toLowerCase())
      );
    });

    const flightDataBinned = getflightsDataBinned(filteredFlights);

    const minMax = getMinMax(flightDataBinned);
    min = minMax.min;
    max = minMax.max;

    scales = {
      linear: d3.scaleLinear([1, max], [0, 1]),
      symlog: d3.scaleSymlog([1, max], [0, 1]).constant(10),
    };

    // Convert to data for arcs of the globe
    const globeData = getGlobeData(flightDataBinned, bombay);

    // Use globe data and generate points/bars
    const globePointData = getPointsData(globeData);

    // Render the globe first time
    globe = window
      .Globe()
      .globeImageUrl(
        "https://pbutcher.uk/bodah/bodah-air-traffic-globe/textures/earth_lights_dimmest.jpg"
      )
      .bumpImageUrl(
        "https://pbutcher.uk/bodah/bodah-air-traffic-globe/textures/earth_bumpmap.jpg"
      )
      .arcsData(globeData)
      .arcColor((d) =>
        colorScheme(options.colorScheme)(scales[options.scale](d.color))
      )
      .arcLabel("label")
      .arcDashLength(0.75)
      .arcStroke(options.flightArcDiameter)
      .arcDashGap(1)
      .arcDashInitialGap(() => Math.random())
      .arcDashAnimateTime(options.animateFlights ? 5000 : 0)
      .pointsData(globePointData)
      .pointLabel("label")
      .pointColor((d) =>
        colorScheme(options.colorScheme)(scales[options.scale](d.color))
      )
      .pointAltitude((d) =>
        options.showAirportFlightFrequency
          ? scales[options.scale](d.altitude) * options.altitudeScaleFactor
          : null
      )
      .pointRadius(0.05)
      .onGlobeReady(() => {
        globe.pointOfView(
          { lat: bombay.lat - 3, lng: bombay.long + 10, altitude: 0.75 },
          5000
        );
      })(document.getElementById("globe"));

    // Set default rotation and speed for the globe
    globe.controls().autoRotate = options.rotateGlobe;
    globe.controls().autoRotateSpeed = options.globeRotationSpeed;

    // What text we need to show on the left top side
    const destinationAirport = airportName[options.destination];
    const airlineText =
      options.airline === "All" ? "" : `for ${options.airline}`;
    descriptionEl.innerText = `Rendering data for ${filteredFlights.length.toLocaleString()} non-domestic flights into ${destinationAirport} (${
      options.destination
    }) on ${globeData.length.toLocaleString()} routes ${airlineText}`;

    // Generate legend
    generateLegend(
      legendEl,
      "Flight Count",
      max,
      scales.symlog,
      scales.linear,
      colorScheme(options.colorScheme)
    );

    // Define which airline options are available for a filter to show in dropdown
    airlineOptions = filteredFlights.reduce(
      (acc, current) => {
        if (!acc.includes(current.company)) acc.push(current.company);
        return acc;
      },
      ["All"]
    );
  }

  await loadGlobe(); // This will make sure that the globe will load initially first time and then it will execute the rest code.

  // When user changes the destination, we need to recalculate the airlines to show in a dropdown.
  // By using this function we are removing a filter and appending again with new airline options.
  const removeAppendAirlineController = (airlineOptions) => {
    guiFlights.remove(airlineController);
    airlineController = guiFlights
      .add(options, "airline")
      .options(airlineOptions)
      .name("Airline")
      .onChange((e) => {
        options.airline = e;
        refreshData();
      });
  };

  // This function will execute whenever there is a change in destination or airline.
  // It will refetch the data. It will recalculate the arcs and points data and then it will replace on the globe
  const refreshData = async (shouldRemoveAirlineController) => {
    const flights = await loadFlights();
    const filteredFlights = flights.filter((item) => {
      return (
        options.destination.toLowerCase() === item.destination.toLowerCase() &&
        (options.airline === "All"
          ? true
          : options.airline.toLowerCase() === item.company.toLowerCase())
      );
    });
    const bombay = latLongMap[options.destination];
    const flightsDataBinned = getflightsDataBinned(filteredFlights);
    const globeData = getGlobeData(flightsDataBinned, bombay);
    const pointsData = getPointsData(globeData);
    const minMax = getMinMax(flightsDataBinned);
    min = minMax.min;
    max = minMax.max;

    scales = {
      linear: d3.scaleLinear([1, max], [0, 1]),
      symlog: d3.scaleSymlog([1, max], [0, 1]).constant(10),
    };

    // Setting new arcs and points/bar data on the globe.
    globe.arcsData(globeData);
    globe.pointsData(pointsData);
    globe.arcColor((d) =>
      colorScheme(options.colorScheme)(scales[options.scale](d.color))
    );
    globe.pointColor((d) =>
      colorScheme(options.colorScheme)(scales[options.scale](d.color))
    );

    // Upper-left text update.
    const airlineText =
      options.airline !== "All" ? `for ${options.airline}` : "";
    descriptionEl.innerText = `Rendering data for ${filteredFlights.length.toLocaleString()} non-domestic flights into Mumbai airport (BOM) on ${globeData.length.toLocaleString()} routes ${airlineText}`;

    // Generate legend
    generateLegend(
      legendEl,
      "Flight Count",
      max,
      scales.symlog,
      scales.linear,
      colorScheme(options.colorScheme)
    );

    // If user has changed the destination, then we need to remove and update airline filter.
    // Here we are just recalculating the airline options to show in a dropdown.
    if (shouldRemoveAirlineController) {
      const airlineOptions = filteredFlights.reduce(
        (acc, current) => {
          if (!acc.includes(current.company)) acc.push(current.company);
          return acc;
        },
        ["All"]
      );

      removeAppendAirlineController(airlineOptions);
    }
  };

  // Window resize handler
  window.addEventListener("resize", (event) => {
    globe.width([event.target.innerWidth]);
    globe.height([event.target.innerHeight]);
  });

  // Dat GUI Controls - Setting all the filter controls one-by-one
  guiGlobe
    .add(options, "rotateGlobe")
    .name("Rotate Globe")
    .onChange((e) => {
      globe.controls().autoRotate = e;
      options.rotateGlobe = e;
    });

  guiGlobe
    .add(options, "globeRotationSpeed", -2, 2, 0.05)
    .name("Rotation Speed")
    .onChange((e) => {
      globe.controls().autoRotateSpeed = e;
      options.globeRotationSpeed = e;
    });

  guiGlobe
    .add(options, "useLogScale")
    .name("Use Logarithmic Scale")
    .onChange((e) => {
      options.useLogScale = e;
      if (options.useLogScale) {
        options.scale = "symlog";
      } else {
        options.scale = "linear";
      }
      updateScale();
    });

  guiGlobe
    .add(options, "colorScheme")
    .options(d3ColorSchemes)
    .name("Colour Scale")
    .onChange((e) => {
      options.colorScheme = e;
      updateScale();
    });

  guiAirports
    .add(options, "showAirportFlightFrequency")
    .name("Show Flight Frequencies")
    .onChange((e) => {
      options.showAirportFlightFrequency = e;
      return e
        ? globe.pointAltitude(
            (el) =>
              scales[options.scale](el.flightCount) *
              options.altitudeScaleFactor
          )
        : globe.pointAltitude(null);
    });

  guiAirports
    .add(options, "altitudeScaleFactor", 0.01, 1, 0.01)
    .name("Altitude Scale Factor")
    .onChange((e) => {
      options.altitudeScaleFactor = e;
      return options.showAirportFlightFrequency
        ? globe.pointAltitude(
            (el) =>
              scales[options.scale](el.flightCount) *
              options.altitudeScaleFactor
          )
        : globe.pointAltitude(null);
    });

  // Destination filter
  guiFlights
    .add(options, "destination")
    .options(flightOptions)
    .name("Destination")
    .onChange((e) => {
      options.airline = "All";
      options.destination = e;
      refreshData(true);
    });

  // Airline filter
  airlineController = guiFlights
    .add(options, "airline")
    .options(airlineOptions)
    .name("Airline")
    .onChange((e) => {
      options.airline = e;
      refreshData();
    });

  // Change GUI appearance
  datguiEl.querySelector(".dg.main").style.width = "400px";

  // Generate a legend - Upper right gradient bar
  function generateLegend(el, label, max, numSc, colSc, colItl) {
    // Clear existing legend
    el.replaceChildren();

    // Create new legend elements
    let headingEl = document.createElement("div");
    headingEl.classList.add("legend-heading");
    let scaleContainerEl = document.createElement("div");
    scaleContainerEl.classList.add("legend-scale-container");
    let scaleEl = document.createElement("div");
    scaleEl.classList.add("legend-scale");
    let gradientEl = document.createElement("div");
    gradientEl.classList.add("legend-gradient");

    //   // Set heading
    headingEl.innerText = label;

    // Gradient
    let gr = [];
    for (let i = 0; i <= max; i += max / 10) {
      gr.push(`${colItl(colSc(i))} ${(i / max) * 100}%`);
    }
    let gStr = `linear-gradient(to top, ${gr.join(", ")})`;
    gradientEl.style.background = gStr;

    // Ticks
    for (let i = 4; i >= 0; i--) {
      let tick = document.createElement("div");
      tick.classList.add("legend-tick");
      tick.innerText = Math.round(numSc.invert((i * (max / 4)) / max));
      scaleEl.appendChild(tick);
    }

    // Build and set legend
    scaleContainerEl.appendChild(scaleEl);
    scaleContainerEl.appendChild(gradientEl);
    el.appendChild(headingEl);
    el.appendChild(scaleContainerEl);
  }

  // Update scale
  const updateScale = () => {
    // Arc color
    globe.arcColor((d) =>
      colorScheme(options.colorScheme)(scales[options.scale](d.color))
    );
    // Point color
    globe.pointColor((d) =>
      colorScheme(options.colorScheme)(scales[options.scale](d.color))
    );

    generateLegend(
      legendEl,
      "Flight Count",
      max,
      scales[options.scale],
      scales.linear,
      colorScheme(options.colorScheme)
    );
  };

  // Load flights
  async function loadFlights() {
    return await fetch(
      "https://raw.githubusercontent.com/mrtownboy/2D-Globe/main/IndiaFlightsDataSet"
    )
      .then((res) => res.text())
      .then((d) => {
        return d3
          .csvParseRows(d, parseRows)
          .filter(
            (record) =>
              record.originLat &&
              record.originLong &&
              record.destLat &&
              record.destLong
          );
      });
  }
});
