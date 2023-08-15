let CONFIG = {
    timerInterval: 1 * 60 * 60 * 1000,
    jobOnId: 2,
    jobOffId: 3,
    apiUri: "https://INSERT_WORKER_URL.workers.dev/?format=lowest_daytime"
  };
  
  let hour = -1;
  let timer = null;
  
  // Fetch from API
  function fetch() {
    print("Fetch from API")
    Shelly.call(
      "HTTP.GET", {
        "url": CONFIG.apiUri,
      },
      processHttpResponse
    );
  }
  
  // Process fetched data, set global variable 'hour', notify MQTT
  function processHttpResponse(response) {
    if (response && response.code && response.code === 200) {
      hour = JSON.parse(response.body).hour;
      MQTT.publish("shelly/vvb/script", "Enable at " + JSON.stringify(hour));
    } else {
      hour = -1;
      print("Failed to get")
      MQTT.publish("shelly/vvb/script", "Failed to get hour");
    }
    updateSchedule();
  }
  
  // Update schedule according to fetched data
  function updateSchedule() {
    Shelly.call("Schedule.List", {}, function(result) {
      //print(result.jobs[CONFIG.jobOnId].id, result.jobs[CONFIG.jobOnId].timespec, result.jobs[CONFIG.jobOnId].enable);
      let jobOn = result.jobs[CONFIG.jobOnId];
      let jobOff = result.jobs[CONFIG.jobOffId];
  
      if (hour === -1) {
        jobOn.enable = false;
        jobOff.enable = false;
      } else {
        jobOn.timespec = "0 0 " + JSON.stringify(hour) + " * * SUN,MON,TUE,WED,THU,FRI,SAT";
        jobOn.enable = true;
        jobOff.timespec = "0 0 " + JSON.stringify(hour + 1) + " * * SUN,MON,TUE,WED,THU,FRI,SAT";
        jobOff.enable = true;
      }
    
      Shelly.call("Schedule.Update", jobOn, function(result) {
        print("Updated ON job. Rev: ", result.rev)
      });
      
      Shelly.call("Schedule.Update", jobOff, function(result) {
        print("Updated OFF job. Rev: ", result.rev)
      });
    });
  }
  
  // Schedule fetch
  timer = Timer.set(CONFIG.timerInterval,
      true,
      fetch,
      null
  );
  
  // Fetch now
  fetch();
  print("Script running")