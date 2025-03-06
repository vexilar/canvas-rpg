const makeStandingFrames = (rootFrame = 0) => {
  return {
    duration: 400,
    frames: [
      {
        time: 0,
        frame: rootFrame,
      }
    ]
  }
}
const makeWalkingFrames = (rootFrame=0) => {
  return {
    duration: 600,
    frames: [
      {
        time: 0,
        frame: rootFrame+1
      },
      {
        time: 100,
        frame: rootFrame+2
      },
      {
        time: 200,
        frame: rootFrame+3
      },
      {
        time: 300,
        frame: rootFrame+4
      },
      {
        time: 400,
        frame: rootFrame-1
      },
      {
        time: 500,
        frame: rootFrame
      }
    ]
  }
}

export const STAND_RIGHT = makeStandingFrames(1);
export const WALK_RIGHT = makeWalkingFrames(1);