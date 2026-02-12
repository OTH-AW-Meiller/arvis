import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/webxr/ARButton.js';

const container = document.getElementById('container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf7f7fb);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 200, 400);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true; // enable WebXR
// enable shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// enable OrbitControls for rotation
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 20;
controls.maxDistance = 2000;
controls.saveState();

// lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
hemi.position.set(0, 200, 0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(200, 300, 200);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
dir.shadow.bias = -0.0005;
// configure shadow camera (orthographic for directional light)
const s = 500;
dir.shadow.camera.left = -s;
dir.shadow.camera.right = s;
dir.shadow.camera.top = s;
dir.shadow.camera.bottom = -s;
dir.shadow.camera.near = 50;
dir.shadow.camera.far = 1000;
scene.add(dir);

// axes grid removed — clean view

let barsGroup = new THREE.Group();
scene.add(barsGroup);
// AR scaling: make the scene smaller when presenting in AR
const AR_SCALE = 0.25; // adjust this factor to taste (0.25 = 25%)
const NON_AR_SCALE = 1;
// set directional light target after barsGroup exists
if (dir) dir.target = barsGroup;

// add ground plane to receive shadows
const groundGeo = new THREE.PlaneGeometry(300, 300);
const groundMat = new THREE.MeshStandardMaterial({ color: 0xececec });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

// Reticle for AR hit-test placement
const reticleGeometry = new THREE.RingGeometry(0.12, 0.15, 32).rotateX(-Math.PI / 2);
const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

// load CSV and build bars
async function loadAndBuild() {
  // load local groups CSV and build bars (no external fetches)
  const res = await fetch('data/data_groups.csv');
  if (!res.ok) throw new Error('Failed to load /data/data_groups.csv');
  const txt = await res.text();
  const rows = txt.trim().split('\n').filter(r => r.trim());
  const header = rows.shift().split(',');
  const data = rows.map(r => {
    const cols = r.split(',').map(c => c.trim());
    const year = parseInt(cols[0], 10);
    const vals = cols.slice(1).map(Number);
    return { year, values: vals };
  });
  buildBars(data);
}

  // removed external World Bank fetching — using only local CSV data


function buildBars(data) {
  // clear
  while (barsGroup.children.length) barsGroup.remove(barsGroup.children[0]);

  // data: array of {year, total, values[]} where values length == number of groups
  const years = data.map(d => d.year);
  const groupsCount = data[0] ? data[0].values.length : 0;

  // compute global max across all groups for consistent scaling
  let globalMax = 0;
  data.forEach(d => d.values.forEach(v => { if (v > globalMax) globalMax = v; }));
  if (globalMax === 0) globalMax = 1;

  const barWidth = 1.2;
  const gap = 1.0;
  const depth = 6; // thickness along z for each bar
  const rowSpacing = 20; // distance between group rows along z

  const totalWidth = data.length * (barWidth + gap);
  const startX = -totalWidth / 2 + (barWidth + gap) / 2;

  // create bars: rows = groups, columns = years
  for (let g = 0; g < groupsCount; g++) {
    const rowGroup = new THREE.Group();
    const z = (g - (groupsCount - 1) / 2) * rowSpacing;
    rowGroup.position.z = z;

    data.forEach((d, i) => {
      const val = d.values[g] || 0;
      const h = (val / globalMax) * 200;
      const geometry = new THREE.BoxGeometry(barWidth, h, depth);
      const hue = 0.6 - (g / Math.max(1, groupsCount - 1)) * 0.5;
      const color = new THREE.Color().setHSL(hue, 0.7, 0.5);
      const material = new THREE.MeshStandardMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      // enable shadows for bars
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.position.x = startX + i * (barWidth + gap);
      mesh.position.y = h / 2;
      mesh.userData = { year: d.year, value: val, group: g };
      rowGroup.add(mesh);
    });

    barsGroup.add(rowGroup);
  }

  // add simple DOM legend for groups
  const ui = document.getElementById('ui');
  const existing = document.getElementById('legend');
  if (existing) existing.remove();
  const legend = document.createElement('div');
  legend.id = 'legend';
  legend.style.marginTop = '8px';
  legend.innerHTML = '<strong>Groups</strong><br/>';
  const groupNames = ['1: 0-5','2: 6-14','3: 15-19','4: 20-44','5: 45-64','6: 65+'];
  for (let g = 0; g < groupsCount; g++) {
    const hue = 0.6 - (g / Math.max(1, groupsCount - 1)) * 0.5;
    const color = new THREE.Color().setHSL(hue, 0.7, 0.5).getStyle();
    const item = document.createElement('div');
    item.innerHTML = `<span style="display:inline-block;width:12px;height:12px;background:${color};margin-right:6px;"></span>${groupNames[g] || 'group '+g}`;
    legend.appendChild(item);
  }
  ui.appendChild(legend);
}

// interaction: hover tooltip
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.createElement('div');
tooltip.style.position = 'absolute';
tooltip.style.pointerEvents = 'none';
tooltip.style.background = 'rgba(0,0,0,0.7)';
tooltip.style.color = '#fff';
tooltip.style.padding = '6px 8px';
tooltip.style.borderRadius = '4px';
tooltip.style.fontSize = '12px';
tooltip.style.display = 'none';
document.body.appendChild(tooltip);

function onPointerMove(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(barsGroup.children.flatMap(g => g.children), true);
  if (intersects.length) {
    const obj = intersects[0].object.userData;
    if (obj && obj.year) {
      tooltip.style.display = 'block';
      tooltip.style.left = e.clientX + 10 + 'px';
      tooltip.style.top = e.clientY + 10 + 'px';
      tooltip.innerHTML = `<strong>${obj.year}</strong><br/>Group: ${obj.group + 1} — ${obj.value.toLocaleString()} persons`;
    }
  } else {
    tooltip.style.display = 'none';
  }
}

window.addEventListener('pointermove', onPointerMove);

// animation loop: update controls and render continuously for smooth rotation
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// WebXR / AR setup: add AR button to UI when supported
const ui = document.getElementById('ui');
if (navigator.xr) {
  try {
    const arButton = ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] });
    // put AR button inside our UI container
    ui.appendChild(arButton);
  } catch (e) {
    console.warn('ARButton failed to create:', e);
  }
} else {
  // for browsers without WebXR, show a hint
  const hint = document.createElement('div');
  hint.style.marginTop = '8px';
  hint.textContent = 'WebXR not available — fallback 3D view enabled.';
  ui.appendChild(hint);
}

// XR hit-test variables
let hitTestSource = null;
let hitTestSourceRequested = false;

// controller for select events in AR
const controller = renderer.xr.getController(0);
controller.addEventListener('select', () => {
  if (reticle.visible) {
    // place the barsGroup at the reticle position and orientation
    barsGroup.position.setFromMatrixPosition(reticle.matrix);
    // copy orientation
    const m = new THREE.Matrix4();
    m.extractRotation(reticle.matrix);
    barsGroup.quaternion.setFromRotationMatrix(m);
    barsGroup.visible = true;
    // when placed in AR, use the AR scale so the chart appears smaller
    barsGroup.scale.setScalar(AR_SCALE);
    // hide reticle after placing
    reticle.visible = false;
  }
});
scene.add(controller);

// render function used by both XR and non-XR
function render(timestamp, frame) {
  // handle XR hit-test
  if (frame) {
    const session = renderer.xr.getSession();
    if (!hitTestSourceRequested) {
      session.requestReferenceSpace('viewer').then((refSpace) => {
        session.requestHitTestSource({ space: refSpace }).then((source) => {
          hitTestSource = source;
        });
      });
      session.addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });
      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const referenceSpace = renderer.xr.getReferenceSpace();
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }

  // when in AR mode, disable orbit controls and hide ground
  if (renderer.xr.isPresenting) {
    controls.enabled = false;
    ground.visible = false;
    // scale down the chart for AR presentation
    barsGroup.scale.setScalar(AR_SCALE);
  } else {
    controls.enabled = true;
    ground.visible = true;
    // restore normal scale when not in AR
    barsGroup.scale.setScalar(NON_AR_SCALE);
  }

  controls.update();
  renderer.render(scene, camera);
}

// Use setAnimationLoop to support XR frame loop; this also works in non-XR browsers
function startLoop() {
  renderer.setAnimationLoop(render);
}

// start
loadAndBuild().then(() => startLoop()).catch(err => {
  console.error(err);
});
