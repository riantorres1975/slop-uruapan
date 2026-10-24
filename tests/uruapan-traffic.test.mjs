import test from 'node:test';
import assert from 'node:assert/strict';
import { GraphAgent } from '../js/uruapan/traffic.js';
import { makeGraph } from '../js/uruapan/geo.js';
const road={id:'real-way-fixture',nodeIds:[1,2,3],points:[[0,0],[10,0],[20,0]],width:8,drivable:true,grade:0,tags:{oneway:'yes'}};
test('IA avanza por nodos conectados sin inventar retornos en calles de un sentido',()=>{const graph=makeGraph([road]),actor=new GraphAgent(graph,0);actor.advance(12);assert.equal(graph.edges[actor.edge].from,'2:0');assert.ok(actor.x>=10&&actor.x<=20);actor.advance(1000);assert.equal(actor.x,20);assert.equal(actor.z,0);});
test('IA conserva el lado derecho y reserva intersecciones',()=>{const graph=makeGraph([road,{...road,id:'branch',nodeIds:[2,4],points:[[10,0],[10,10]],tags:{}},{...road,id:'branch2',nodeIds:[2,5],points:[[10,0],[10,-10]],tags:{}}]);const actor=new GraphAgent(graph,0,2),reservations=new Map([['2:0',{index:1,until:10}]]);actor.advance(12,reservations,1);assert.ok(actor.t<10);actor.locate(1.5);assert.equal(actor.z,1.5);actor.advance(5,reservations,11);assert.equal(reservations.get('2:0').index,2);});
