/**
 * HYTOPIA SDK Boilerplate
 *
 * This is a simple boilerplate to get started on your project.
 * It implements the bare minimum to be able to run and connect
 * to your game server and run around as the basic player entity.
 *
 * From here you can begin to implement your own game logic
 * or do whatever you want!
 *
 * You can find documentation here: https://github.com/hytopiagg/sdk/blob/main/docs/server.md
 *
 * For more in-depth examples, check out the examples folder in the SDK, or you
 * can find it directly on GitHub: https://github.com/hytopiagg/sdk/tree/main/examples/payload-game
 *
 * You can officially report bugs or request features here: https://github.com/hytopiagg/sdk/issues
 *
 * To get help, have found a bug, or want to chat with
 * other HYTOPIA devs, join our Discord server:
 * https://discord.gg/DXCXJbHSJX
 *
 * Official SDK Github repo: https://github.com/hytopiagg/sdk
 * Official SDK NPM Package: https://www.npmjs.com/package/hytopia
 */

import {
  startServer,
  Audio,
  PlayerEntity,
  PlayerEvent,
  GameServer,
  Vector3,
  Entity,
  EntityEvent,
  RigidBodyType,
  ColliderShape,
  Collider,
  PlayerEntityController,
  Player,
  PlayerCameraMode,
  Light,
} from "hytopia";

import worldMap from "./assets/map_fin.json";

const playerScores: Record<string, number> = {}; // UUID -> total time
let startTime = 0;
let gameFinished = false; // Track if player has finished

// Function to get random spawn position
function getRandomSpawnPosition(): { x: number; y: number; z: number } {
  return {
    x: Math.random() * 5.5 - 2, // Random between -2 and 3.5
    y: 10,
    z: Math.random() * 3 + 40, // Random between 40 and 43
  };
}

/**
 * startServer is always the entry point for our game.
 * It accepts a single function where we should do any
 * setup necessary for our game. The init function is
 * passed a World instance which is the default
 * world created by the game server on startup.
 *
 * Documentation: https://github.com/hytopiagg/sdk/blob/main/docs/server.startserver.md
 */

startServer((world) => {
  /**
   * Play some peaceful ambient music to
   * set the mood! This is initialized once when the server starts
   * and will be heard by all players.
   */

  const globalAudio = new Audio({
    uri: "audio/music/bg.mp3",
    loop: true,
    volume: 0.05,
  });

  // globalAudio.pause();

  // Add command to toggle music for all players
  world.chatManager.registerCommand("/togglemusic", (player) => {
    if (!globalAudio.isPlaying) {
      globalAudio.play(world);
      world.chatManager.sendPlayerMessage(player, "Background music resumed", "00FF00");
    } else {
      globalAudio.pause();
      world.chatManager.sendPlayerMessage(player, "Background music paused", "00FF00");
    }
  });

  /**
   * Enable debug rendering of the physics simulation.
   * This will overlay lines in-game representing colliders,
   * rigid bodies, and raycasts. This is useful for debugging
   * physics-related issues in a development environment.
   * Enabling this can cause performance issues, which will
   * be noticed as dropped frame rates and higher RTT times.
   * It is intended for development environments only and
   * debugging physics.
   */

  // world.simulation.enableDebugRendering(true);

  /**
   * Load our map.
   * You can build your own map using https://build.hytopia.com
   * After building, hit export and drop the .json file in
   * the assets folder as map.json.
   */

  world.loadMap(worldMap);

  /**
   * Create a checkpoint entity
   */
  // const checkpoint = new Entity({
  //   modelUri: "models/items/snowball.gltf",
  //   modelScale: 2.0,
  //   name: "checkpoint",
  //   rigidBodyOptions: {
  //     type: RigidBodyType.KINEMATIC_VELOCITY,
  //     rotation: { x: 0, y: 0, z: 0, w: 0 },
  //   },
  //   tag: "checkpoint", // Use tag instead of tags
  // });

  // // Spawn the checkpoint
  // checkpoint.spawn(world, { x: 10, y: 3, z: 0 });

  /**
   * Handle player joining the game. The PlayerEvent.JOINED_WORLD
   * event is emitted to the world when a new player connects to
   * the game. From here, we create a basic player
   * entity instance which automatically handles mapping
   * their inputs to control their in-game entity and
   * internally uses our player entity controller.
   *
   * The HYTOPIA SDK is heavily driven by events, you
   * can find documentation on how the event system works,
   * here: https://dev.hytopia.com/sdk-guides/events
   */
  world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
    const playerEntity = new PlayerEntity({
      player,
      name: "Player",
      modelUri: "models/players/player.gltf",
      modelLoopedAnimations: ["idle"],
      modelScale: 0.5,
    });

    let i = 5;

    const interval = setInterval(() => {
      if (i == 0) {
        clearInterval(interval);
        startTime = Date.now();
        gameFinished = false; // Reset game state
      }
      i--;
    }, 1000);

    playerEntity.spawn(world, getRandomSpawnPosition());

    // Check for falling off
    setInterval(() => {
      // world.chatManager.sendPlayerMessage(
      //   player,
      //   `x : ${playerEntity.position.x}  z : ${playerEntity.position.z}`,
      //   "FF0000"
      // );
      if (playerEntity.position.y <= -10 && !gameFinished) {
        // Only respawn if game isn't finished
        new Audio({
          uri: "audio/sfx/damage/fall-small.mp3",
          loop: false,
          volume: 0.1,
          cutoffDistance: 50,
          attachedToEntity: playerEntity,
        }).play(world);
        world.chatManager.sendPlayerMessage(player, `Player ${player.username} fell off the platform`, "FF0000");
        playerEntity.setPosition(getRandomSpawnPosition());
      }
    }, 1000);

    // Handle collisions globally
    // world.on(EntityEvent.ENTITY_COLLISION, ({ entity, otherEntity, started }) => {
    //   if (!started) return; // Only handle when collision starts

    //   // Check if one entity is our player and the other has the checkpoint tag
    //   if (entity === playerEntity && otherEntity == checkpoint) {
    //     world.chatManager.sendPlayerMessage(player, "Checkpoint reached!", "00FF00");
    //     // You can save this position as a respawn point, trigger events, etc.
    //   }
    // });

    const finishLine = new Collider({
      shape: ColliderShape.BLOCK,
      halfExtents: { x: 2, y: 1, z: 2 },
      relativePosition: { x: 29, y: 2, z: 42 },
      onCollision: (other: any, started: boolean) => {
        if (other == playerEntity && started && !gameFinished) {
          gameFinished = true; // Mark game as finished

          playerEntity.despawn();

          // Show finish messages
          world.chatManager.sendPlayerMessage(player, `🏁 ${player.username} reached the finish line! 🏁`, "00FF00");
          const endTime = Date.now();
          const totalTime = (endTime - startTime) / 1000;

          // Only update score if it's better than previous best or if player has no previous score
          const previousBest = playerScores[player.username];
          if (!previousBest || totalTime < previousBest) {
            playerScores[player.username] = totalTime;
            world.chatManager.sendPlayerMessage(player, `New best time! ${totalTime.toFixed(2)} seconds`, "00FF00");
          } else {
            world.chatManager.sendPlayerMessage(
              player,
              `Time: ${totalTime.toFixed(2)} seconds (Best: ${previousBest.toFixed(2)})`,
              "FFFF00"
            );
          }

          //   world.chatManager.sendPlayerMessage(player, "Type /restart to play again!", "FFFF00");
          player.ui.sendData({ type: "time", time: totalTime });
          player.ui.sendData({ type: "leaderboard", list: playerScores });

          // Optional: Play a victory sound
        }
      },
    });


    // Add restart command
    world.chatManager.registerCommand("/restart", (player) => {
      if (gameFinished) {
        startTime = Date.now();
        world.chatManager.sendPlayerMessage(player, "Game restarted! Beat your score!", "00FF00");
        playerEntity.spawn(world, getRandomSpawnPosition());
        player.camera.setMode(PlayerCameraMode.THIRD_PERSON);
        player.camera.setAttachedToEntity(playerEntity);
        playerEntity.setGravityScale(1);

        player.ui.sendData({ type: "restart", time: 0 });
        new Audio({
          uri: "audio/sfx/entity/portal/portal-travel-woosh.mp3",
          loop: false,
          volume: 0.1,
          cutoffDistance: 50,
          attachedToEntity: playerEntity,
        }).play(world);
        gameFinished = false;
      }
    });

    finishLine.addToSimulation(world.simulation);

    // Clamp the z range the platform moves back and forth between
    moving_downUp1.on(EntityEvent.TICK, () => {
      const position = moving_downUp1.position;

      if (position.y < 0) {
        moving_downUp1.setLinearVelocity({ x: 0, y: 3, z: 0 });
      }

      if (position.y > 5) {
        moving_downUp1.setLinearVelocity({ x: 0, y: -3, z: 0 });
      }
    });

    moving_downUp2.on(EntityEvent.TICK, () => {
      const position = moving_downUp2.position;

      if (position.y < 0) {
        moving_downUp2.setLinearVelocity({ x: 0, y: 3, z: 0 });
      }

      if (position.y > 5) {
        moving_downUp2.setLinearVelocity({ x: 0, y: -3, z: 0 });
      }
    });

    moving_onZ.on(EntityEvent.TICK, () => {
      const position = moving_onZ.position;

      if (position.z < -26) {
        moving_onZ.setLinearVelocity({ x: 0, y: 0, z: 3 });
      }

      if (position.z > -12) {
        moving_onZ.setLinearVelocity({ x: 0, y: 0, z: -3 });
      }
    });
    moving_onZ2.on(EntityEvent.TICK, () => {
      const position = moving_onZ2.position;

      if (position.z < -26) {
        moving_onZ2.setLinearVelocity({ x: 0, y: 0, z: 3 });
      }

      if (position.z > -12) {
        moving_onZ2.setLinearVelocity({ x: 0, y: 0, z: -3 });
      }
    });

    // Load our game UI for this player
    player.ui.load("ui/index.html");

    // Send a nice welcome message that only the player who joined will see ;)
    world.chatManager.sendPlayerMessage(player, "Welcome to the Voxel Fall!", "00FF00");
    world.chatManager.sendPlayerMessage(player, "Use WASD to move around.");
    world.chatManager.sendPlayerMessage(player, "Press space to jump.");
    world.chatManager.sendPlayerMessage(player, "type /togglemusic to toggle music.");
    world.chatManager.sendPlayerMessage(player, "Hold shift to sprint.");
    world.chatManager.sendPlayerMessage(player, "Reach the finish line to rank up!");
  });

  const moving_downUp1 = new Entity({
    blockTextureUri: "blocks/grass", // A texture URI without a file extension will use a folder and look for the textures for each face in the folder (-x.png, +x.png, -y.png, +y.png, -z.png, +z.png)
    blockHalfExtents: { x: 1, y: 0.5, z: 1 },
    rigidBodyOptions: {
      type: RigidBodyType.KINEMATIC_VELOCITY, // Kinematic means platform won't be effected by external physics, including gravity
      linearVelocity: { x: 0, y: 3, z: 0 }, // A starting velocity that won't change because it's kinematic
    },
  });

  const moving_downUp2 = new Entity({
    blockTextureUri: "blocks/grass", // A texture URI without a file extension will use a folder and look for the textures for each face in the folder (-x.png, +x.png, -y.png, +y.png, -z.png, +z.png)
    blockHalfExtents: { x: 1, y: 0.5, z: 1 },
    rigidBodyOptions: {
      type: RigidBodyType.KINEMATIC_VELOCITY, // Kinematic means platform won't be effected by external physics, including gravity
      linearVelocity: { x: 0, y: 3, z: 0 }, // A starting velocity that won't change because it's kinematic
    },
  });

  const moving_onZ = new Entity({
    blockTextureUri: "blocks/grass", // A texture URI without a file extension will use a folder and look for the textures for each face in the folder (-x.png, +x.png, -y.png, +y.png, -z.png, +z.png)
    blockHalfExtents: { x: 2, y: 0.5, z: 2 },
    rigidBodyOptions: {
      type: RigidBodyType.KINEMATIC_VELOCITY, // Kinematic means platform won't be effected by external physics, including gravity
      linearVelocity: { x: 0, y: 0, z: 3 }, // A starting velocity that won't change because it's kinematic
    },
  });
  const moving_onZ2 = new Entity({
    blockTextureUri: "blocks/grass", // A texture URI without a file extension will use a folder and look for the textures for each face in the folder (-x.png, +x.png, -y.png, +y.png, -z.png, +z.png)
    blockHalfExtents: { x: 2, y: 0.5, z: 2 },
    rigidBodyOptions: {
      type: RigidBodyType.KINEMATIC_VELOCITY, // Kinematic means platform won't be effected by external physics, including gravity
      linearVelocity: { x: 0, y: 0, z: 3.2 }, // A starting velocity that won't change because it's kinematic
    },
  });

  const rotating_onX = new Entity({
    blockTextureUri: "blocks/log", // A texture URI without a file extension will use a folder and look for the textures for each face in the folder (-x.png, +x.png, -y.png, +y.png, -z.png, +z.png)
    blockHalfExtents: { x: 4, y: 0.5, z: 3 },
    rigidBodyOptions: {
      type: RigidBodyType.KINEMATIC_VELOCITY, // Kinematic means platform won't be effected by external physics, including gravity
      angularVelocity: { x: 0.2, y: 0, z: 0 }, // A starting velocity that won't change because it's kinematic
    }, // Kinematic means platform won't be effected by external physics, including gravity
  });

  const rotating_onX2 = new Entity({
    blockTextureUri: "blocks/log", // A texture URI without a file extension will use a folder and look for the textures for each face in the folder (-x.png, +x.png, -y.png, +y.png, -z.png, +z.png)
    blockHalfExtents: { x: 4, y: 0.5, z: 3 },
    rigidBodyOptions: {
      type: RigidBodyType.KINEMATIC_VELOCITY, // Kinematic means platform won't be effected by external physics, including gravity
      angularVelocity: { x: -0.2, y: 0, z: 0 }, // A starting velocity that won't change because it's kinematic
    }, // Kinematic means platform won't be effected by external physics, including gravity
  });

  const rotation_onY = new Entity({
    blockTextureUri: "blocks/log", // A texture URI without a file extension will use a folder and look for the textures for each face in the folder (-x.png, +x.png, -y.png, +y.png, -z.png, +z.png)
    blockHalfExtents: { x: 4, y: 1, z: 0.5 },
    rigidBodyOptions: {
      type: RigidBodyType.KINEMATIC_VELOCITY, // Kinematic means platform won't be effected by external physics, including gravity
      angularVelocity: { x: 0, y: 1.6, z: 0 }, // A starting velocity that won't change because it's kinematic
    }, // Kinematic means platform won't be effected by external physics, including gravity
  });
  //moving on y-axis
  moving_downUp1.spawn(world, { x: 4, y: 0, z: 4 });
  moving_downUp2.spawn(world, { x: -2, y: 0, z: 4 });

  //moving on z axis
  moving_onZ.spawn(world, { x: -1, y: 0, z: -15 });
  moving_onZ2.spawn(world, { x: 3.5, y: 0, z: -22 });

  //rotating on x axis
  rotating_onX.spawn(world, { x: 11.5, y: 0, z: -33.5 });
  rotating_onX2.spawn(world, { x: 20.5, y: 0, z: -33.5 });

  //rotating on y axis
  rotation_onY.spawn(world, { x: 30, y: 3, z: -15 });
  /**
   * Handle player leaving the game. The PlayerEvent.LEFT_WORLD
   * event is emitted to the world when a player leaves the game.
   * Because HYTOPIA is not opinionated on join and
   * leave game logic, we are responsible for cleaning
   * up the player and any entities associated with them
   * after they leave. We can easily do this by
   * getting all the known PlayerEntity instances for
   * the player who left by using our world's EntityManager
   * instance.
   *
   * The HYTOPIA SDK is heavily driven by events, you
   * can find documentation on how the event system works,
   * here: https://dev.hytopia.com/sdk-guides/events
   */
  world.on(PlayerEvent.LEFT_WORLD, ({ player }) => {
    world.entityManager.getPlayerEntitiesByPlayer(player).forEach((entity) => entity.despawn());
  });

  /**
   * A silly little easter egg command. When a player types
   * "/rocket" in the game, they'll get launched into the air!
   */
  world.chatManager.registerCommand("/rocket", (player) => {
    world.entityManager.getPlayerEntitiesByPlayer(player).forEach((entity) => {
      entity.applyImpulse({ x: 0, y: 20, z: 0 });
    });
  });
});
