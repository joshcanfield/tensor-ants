import 'phaser'
import MainScene from "./scenes/main-scene";


const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'genetic-ants',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
    },
    width: 800,
    height: 600,
    backgroundColor: '#787878',
    scene: MainScene
};

const game = new Phaser.Game(config);
