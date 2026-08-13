import * as THREE from '../vendor/three/build/three.module.js';
import { GLTFExporter } from '../vendor/three/examples/jsm/exporters/GLTFExporter.js';

if(typeof globalThis.FileReader==='undefined')globalThis.FileReader=class{
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.()}).catch(error=>this.onerror?.(error))}
  readAsDataURL(blob){blob.arrayBuffer().then(buffer=>{this.result=`data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;this.onloadend?.()}).catch(error=>this.onerror?.(error))}
};

const scene=new THREE.Scene(),root=new THREE.Bone();root.name='root';scene.add(root);
const pelvis=new THREE.Bone();pelvis.name='pelvis';pelvis.position.y=1;root.add(pelvis);
const geometry=new THREE.BoxGeometry(.5,.8,.3);geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(geometry.attributes.position.count*4),4));const weights=new Float32Array(geometry.attributes.position.count*4);for(let i=0;i<geometry.attributes.position.count;i++)weights[i*4]=1;geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshStandardMaterial({color:0xff6448}));mesh.name='authoring-smoke-mesh';mesh.add(root);mesh.bind(new THREE.Skeleton([root,pelvis]));scene.add(mesh);
const clip=new THREE.AnimationClip('ride',1,[new THREE.QuaternionKeyframeTrack('pelvis.quaternion',[0,1],[0,0,0,1,0,0,.05,.9987])]);
const result=await new GLTFExporter().parseAsync(scene,{binary:true,animations:[clip],onlyVisible:true});
console.log(JSON.stringify({arrayBuffer:result instanceof ArrayBuffer,bytes:result.byteLength||0}));
