import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { DotScreenShader } from 'three/addons/shaders/DotScreenShader.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// 画布和渲染器
const canvas = document.querySelector('canvas.webgl');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// 场景和相机
const mainScene = new THREE.Scene(); // 主场景（小球）
const bgScene = new THREE.Scene();   // 背景场景（天空盒）
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 3;

// 添加音频监听器到相机
const listener = new THREE.AudioListener();
camera.add(listener);

// 加载背景音效
const backgroundSound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('audio/background.wav', (buffer) => {
    backgroundSound.setBuffer(buffer); // 设置音频缓冲区
    backgroundSound.setLoop(true); // 循环播放
    backgroundSound.setVolume(0.5); // 设置音量
    backgroundSound.play(); // 开始播放背景音效
});

// 1. 背景天空盒与后处理
const loader = new THREE.CubeTextureLoader();
const bgTexture = loader.load([
    'hdr/px.png', 'hdr/nx.png',
    'hdr/py.png', 'hdr/ny.png',
    'hdr/pz.png', 'hdr/nz.png'
]);
bgScene.background = bgTexture;

// 后处理效果（应用于背景）
const bgComposer = new EffectComposer(renderer);
bgComposer.addPass(new RenderPass(bgScene, camera));

const dotScreenPass = new ShaderPass(DotScreenShader);
dotScreenPass.uniforms['scale'].value = 4;
bgComposer.addPass(dotScreenPass);

const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.uniforms['amount'].value = 0.0015;
bgComposer.addPass(rgbShiftPass);

const outputPass = new OutputPass();
bgComposer.addPass(outputPass);

// 2. 主场景中的小球
const spheres = [];
const velocities = [];

const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 16);
const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 1,
    envMap: bgTexture // 让小球反射背景
});

// 添加球体
for (let i = 0; i < 2000; i++) {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(
        Math.random() * 100 - 50,
        Math.random() * 100 - 50,
        Math.random() * 100 - 50
    );
    mainScene.add(sphere);
    spheres.push(sphere);

    velocities.push({
        x: (Math.random() - 0.5) * 0.1,
        y: (Math.random() - 0.5) * 0.1,
        z: (Math.random() - 0.5) * 0.1
    });
}

// 添加光照
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
mainScene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
mainScene.add(directionalLight);

// --------------------------
// 3. 动画和渲染
// --------------------------
let mouseX = 0, mouseY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX) / 100;
    mouseY = (event.clientY - windowHalfY) / 100;
});

// 动画循环
const animate = () => {
    const timer = 0.0002 * Date.now();

    // 小球运动
    spheres.forEach((sphere, index) => {
        sphere.position.x += velocities[index].x;
        sphere.position.y += velocities[index].y;
        sphere.position.z += velocities[index].z;

        // 反弹效果
        if (sphere.position.x > 50 || sphere.position.x < -50) velocities[index].x *= -1;
        if (sphere.position.y > 50 || sphere.position.y < -50) velocities[index].y *= -1;
        if (sphere.position.z > 50 || sphere.position.z < -50) velocities[index].z *= -1;
    });

    // 相机跟随鼠标
    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (-mouseY - camera.position.y) * 0.05;
    camera.lookAt(mainScene.position);

    // 渲染背景
    bgComposer.render();

    // 渲染主场景
    renderer.autoClear = false; // 禁止自动清空画布
    renderer.clearDepth(); // 清空深度缓冲区
    renderer.render(mainScene, camera);

    requestAnimationFrame(animate);
};

animate();

// 窗口调整
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    bgComposer.setSize(window.innerWidth, window.innerHeight);
});
