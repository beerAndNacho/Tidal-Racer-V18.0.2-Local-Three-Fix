"""Build Tidal Racer's DCC-authored Rhea production rider.

Run with Blender 5.2+ using the extracted official Blender Studio female base:
  blender -b human-base-female-realistic.blend --python scripts/blender/build-authored-rhea.py -- \
    --output assets/glb/riders/rhea-authored-cc0-v4.glb \
    --working art-source/characters/blender-studio-human-base-female/rhea-authored-working.blend \
    --preview art-source/characters/blender-studio-human-base-female/rhea-authored-preview.png

The input is Body Female - Realistic from Blender Studio's CC0 Human Base
Meshes Bundle v1.0.0. Wet gear, safety equipment, the 18-bone game rig, IK
ride pose and seven runtime clips are Tidal Racer project-authored derivative
work. The extracted source blend is never modified in place.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Euler, Quaternion, Vector


CLIPS = ("menu-idle", "ride", "hard-turn", "drift", "boost", "landing", "victory")
BONES = (
    "root", "pelvis", "spine", "chest", "neck", "head",
    "upperArm.L", "foreArm.L", "hand.L", "upperArm.R", "foreArm.R", "hand.R",
    "upperLeg.L", "lowerLeg.L", "boot.L", "upperLeg.R", "lowerLeg.R", "boot.R",
)


def parse_args() -> argparse.Namespace:
    raw = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--working", required=True)
    parser.add_argument("--preview", required=True)
    return parser.parse_args(raw)


def principled(name: str, color, roughness: float, metallic: float = 0.0,
               alpha: float = 1.0, coat: float = 0.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color[:3], alpha)
    node = mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*color[:3], 1.0)
    node.inputs["Roughness"].default_value = roughness
    node.inputs["Metallic"].default_value = metallic
    node.inputs["Alpha"].default_value = alpha
    if "Coat Weight" in node.inputs:
        node.inputs["Coat Weight"].default_value = coat
    if emission and "Emission Color" in node.inputs:
        node.inputs["Emission Color"].default_value = (*emission[:3], 1.0)
        node.inputs["Emission Strength"].default_value = emission[3]
    if alpha < 1.0:
        mat.surface_render_method = "DITHERED"
        mat.use_transparency_overlap = False
    return mat


def apply_modifier(obj, modifier) -> None:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)


def bevel_box(name: str, location, dimensions, material, bevel=0.025, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("Production bevel", "BEVEL")
    modifier.width = min(bevel, min(dimensions) * 0.22)
    modifier.segments = 3
    modifier.limit_method = "ANGLE"
    apply_modifier(obj, modifier)
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def uv_sphere(name: str, location, scale, material, segments=32, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def open_helmet(name: str, location, scale, material):
    obj = uv_sphere(name, location, scale, material, 40, 24)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    doomed = []
    for face in bm.faces:
        center = face.calc_center_median()
        normalized_y = center.y / max(scale[1], 1e-6)
        normalized_z = center.z / max(scale[2], 1e-6)
        if normalized_z < -0.24 or (normalized_y < -0.34 and normalized_z < 0.56):
            doomed.append(face)
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    bm.to_mesh(obj.data)
    bm.free()
    solid = obj.modifiers.new("Helmet shell thickness", "SOLIDIFY")
    solid.thickness = 0.012
    solid.offset = 0.0
    apply_modifier(obj, solid)
    bevel = obj.modifiers.new("Helmet edge finish", "BEVEL")
    bevel.width = 0.004
    bevel.segments = 2
    apply_modifier(obj, bevel)
    return obj


def parent_to_bone(obj, armature, bone_name: str) -> None:
    world = obj.matrix_world.copy()
    obj.parent = armature
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world


def create_armature():
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    armature = bpy.context.object
    armature.name = "Rhea_Competition_Rig"
    data = armature.data
    data.name = "Rhea_Competition_Skeleton"
    data.edit_bones.remove(data.edit_bones[0])

    def bone(name, head, tail, parent=None, connected=False):
        item = data.edit_bones.new(name)
        item.head, item.tail = head, tail
        if parent:
            item.parent = data.edit_bones[parent]
            item.use_connect = connected
        return item

    bone("root", (0, 0, 0), (0, 0, 0.16))
    bone("pelvis", (0, 0, 0.84), (0, 0, 1.01), "root")
    bone("spine", (0, 0, 1.01), (0, 0, 1.18), "pelvis", True)
    bone("chest", (0, 0, 1.18), (0, 0, 1.40), "spine", True)
    bone("neck", (0, 0, 1.40), (0, -0.005, 1.52), "chest", True)
    bone("head", (0, -0.005, 1.52), (0, -0.025, 1.71), "neck", True)
    for side, suffix in ((1, "L"), (-1, "R")):
        bone(f"upperArm.{suffix}", (side * 0.205, 0, 1.365), (side * 0.345, 0, 1.17), "chest")
        bone(f"foreArm.{suffix}", (side * 0.345, 0, 1.17), (side * 0.465, -0.005, 0.96), f"upperArm.{suffix}", True)
        bone(f"hand.{suffix}", (side * 0.465, -0.005, 0.96), (side * 0.515, -0.045, 0.84), f"foreArm.{suffix}", True)
        bone(f"upperLeg.{suffix}", (side * 0.135, 0, 0.88), (side * 0.155, 0, 0.49), "pelvis")
        bone(f"lowerLeg.{suffix}", (side * 0.155, 0, 0.49), (side * 0.145, -0.005, 0.105), f"upperLeg.{suffix}", True)
        bone(f"boot.{suffix}", (side * 0.145, -0.005, 0.105), (side * 0.145, -0.145, 0.045), f"lowerLeg.{suffix}", True)
    bpy.ops.object.mode_set(mode="OBJECT")
    armature.show_in_front = True
    armature["asset_pipeline"] = "Tidal Racer authored rider DCC v1"
    armature["source_license"] = "CC0 1.0 + project-authored derivative"
    return armature


def skin_body(body, armature) -> None:
    """Apply deterministic game weights.

    Blender's heat solver can fail silently on dense, closed anatomical meshes.
    Region-aware nearest-segment weights are reproducible and guarantee that
    every source vertex participates in the exported skin.
    """
    for group in list(body.vertex_groups):
        body.vertex_groups.remove(group)
    groups = {name: body.vertex_groups.new(name=name) for name in BONES}
    rest = {
        bone.name: (bone.head_local.copy(), bone.tail_local.copy())
        for bone in armature.data.bones
    }

    def segment_distance(point, segment):
        start, end = segment
        delta = end - start
        factor = max(0.0, min(1.0, (point - start).dot(delta) / max(delta.length_squared, 1e-8)))
        return (point - (start + delta * factor)).length

    assigned = {name: 0 for name in BONES}
    for vertex in body.data.vertices:
        point = vertex.co
        x, _y, z = point
        side = "L" if x >= 0 else "R"
        arm_edge = 0.215 + max(0.0, 1.18 - z) * 0.07
        if z >= 1.43:
            candidates = ("chest", "neck", "head")
        elif z >= 0.76 and abs(x) > arm_edge:
            candidates = (f"upperArm.{side}", f"foreArm.{side}", f"hand.{side}", "chest")
        elif z < 0.96:
            candidates = (f"upperLeg.{side}", f"lowerLeg.{side}", f"boot.{side}", "pelvis")
        else:
            candidates = ("pelvis", "spine", "chest", "neck")
        ranked = sorted(
            ((name, 1.0 / (segment_distance(point, rest[name]) + 0.025) ** 3.2) for name in candidates),
            key=lambda item: item[1], reverse=True,
        )[:3]
        total = sum(weight for _name, weight in ranked)
        for name, weight in ranked:
            normalized = weight / total
            if normalized < 0.015:
                continue
            groups[name].add([vertex.index], normalized, "REPLACE")
            assigned[name] += 1

    modifier = body.modifiers.new("Rhea Competition Skin", "ARMATURE")
    modifier.object = armature
    modifier.use_deform_preserve_volume = True
    body.parent = armature
    body.matrix_parent_inverse = armature.matrix_world.inverted()
    if any(not vertex.groups for vertex in body.data.vertices):
        raise RuntimeError("Deterministic skinning left unweighted vertices")
    for name in BONES:
        if name != "root" and assigned[name] == 0:
            raise RuntimeError(f"Deterministic skinning produced no weights for {name}")
    body["skinning"] = "region-aware nearest bone segments v1"


def skin_studio_body(body, armature) -> None:
    """Use Blender heat weights on the official manifold Studio base mesh."""
    for modifier in list(body.modifiers):
        if modifier.type == "MULTIRES":
            body.modifiers.remove(modifier)
    for group in list(body.vertex_groups):
        body.vertex_groups.remove(group)
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.parent_set(type="ARMATURE_AUTO", keep_transform=True)
    weighted = {
        group.name: sum(
            1 for vertex in body.data.vertices
            if any(link.group == group.index and link.weight > 0 for link in vertex.groups)
        )
        for group in body.vertex_groups
    }
    missing = [name for name in BONES if weighted.get(name, 0) == 0]
    unweighted = sum(1 for vertex in body.data.vertices if not vertex.groups)
    if missing or unweighted:
        raise RuntimeError(f"Studio auto weights failed: missing={missing}, unweighted={unweighted}")
    body["skinning"] = "Blender automatic heat weights on manifold CC0 Studio topology"
    body["weighted_vertices_by_bone"] = json.dumps(weighted)


def configure_studio_body_materials(body):
    body.data.materials.clear()
    skin = principled("Rhea_Skin_CC0_Studio", (0.38, 0.17, 0.105), 0.46, 0.0, coat=0.09)
    suit = principled("Rhea_Wet_Neoprene", (0.026, 0.105, 0.145), 0.27, 0.04, coat=0.34)
    body.data.materials.append(skin)
    body.data.materials.append(suit)
    for polygon in body.data.polygons:
        center_z = sum(body.data.vertices[index].co.z for index in polygon.vertices) / len(polygon.vertices)
        polygon.material_index = 1 if center_z < 1.44 else 0
    return skin, suit


def configure_body_materials(body):
    skin = body.data.materials[0]
    eyes = body.data.materials[1]
    skin.name = "Rhea_Skin_CC0_1K"
    eyes.name = "Rhea_Eyes_CC0"
    suit = principled("Rhea_Wet_Neoprene", (0.026, 0.105, 0.145), 0.27, 0.04, coat=0.34)
    body.data.materials.append(suit)
    suit_index = len(body.data.materials) - 1
    for polygon in body.data.polygons:
        if polygon.material_index != 0:
            continue
        center_z = sum(body.data.vertices[index].co.z for index in polygon.vertices) / len(polygon.vertices)
        if center_z < 1.455:
            polygon.material_index = suit_index
    return skin, eyes, suit


def fitted_torso_shell(body, material):
    shell = body.copy()
    shell.data = body.data.copy()
    shell.name = "Rhea_Fitted_Life_Vest"
    shell.data.name = "Rhea_Fitted_Life_Vest_Mesh"
    bpy.context.scene.collection.objects.link(shell)
    shell.data.materials.clear()
    shell.data.materials.append(material)
    bm = bmesh.new()
    bm.from_mesh(shell.data)
    remove_faces = [face for face in bm.faces if not 1.045 <= face.calc_center_median().z <= 1.405]
    bmesh.ops.delete(bm, geom=remove_faces, context="FACES")
    loose = [vertex for vertex in bm.verts if not vertex.link_faces]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.normal_update()
    for vertex in bm.verts:
        vertex.co += vertex.normal * 0.018
    bm.to_mesh(shell.data)
    bm.free()
    for polygon in shell.data.polygons:
        polygon.material_index = 0
        polygon.use_smooth = True
    shell["construction"] = "body-conforming skinned flotation shell"
    return shell


def add_wet_gear(body, armature, materials):
    suit, vest, accent, rubber, visor, reflective = materials
    gear = [fitted_torso_shell(body, vest)]

    def add(obj, bone):
        parent_to_bone(obj, armature, bone)
        gear.append(obj)
        return obj

    add(bevel_box("Rhea_Vest_Yoke", (0, -0.158, 1.38), (0.34, 0.04, 0.065), accent, 0.014), "chest")
    add(bevel_box("Rhea_Rescue_Patch", (0, -0.178, 1.255), (0.16, 0.018, 0.07), reflective, 0.007), "chest")
    add(bevel_box("Rhea_Belt", (0, -0.065, 0.97), (0.42, 0.16, 0.06), rubber, 0.016), "pelvis")
    add(bevel_box("Rhea_Belt_Buckle", (0, -0.183, 0.97), (0.105, 0.028, 0.075), accent, 0.012), "pelvis")
    for side, suffix in ((1, "L"), (-1, "R")):
        add(bevel_box(f"Rhea_Vest_Shoulder_Strap_{suffix}", (side * 0.14, -0.145, 1.35), (0.055, 0.018, 0.14), accent, 0.006), "chest")
        add(bevel_box(f"Rhea_Vest_Side_Reflector_{suffix}", (side * 0.18, -0.15, 1.23), (0.035, 0.016, 0.16), reflective, 0.005), "chest")
        add(bevel_box(f"Rhea_Vest_Lower_Trim_{suffix}", (side * 0.14, -0.15, 1.075), (0.12, 0.016, 0.035), accent, 0.006), "chest")
    helmet = add(open_helmet("Rhea_Open_Race_Helmet", (0, -0.018, 1.60), (0.15, 0.162, 0.174), accent), "head")
    add(bevel_box("Rhea_Helmet_Visor", (0, -0.15, 1.60), (0.205, 0.012, 0.052), visor, 0.007, (math.radians(-8), 0, 0)), "head")
    add(bevel_box("Rhea_Helmet_Crown_Stripe", (0, -0.018, 1.765), (0.035, 0.105, 0.012), reflective, 0.004), "head")
    helmet["safety_standard_style"] = "closed-water competition shell"
    return gear


def set_bone_rotation(pose_bone, degrees) -> None:
    pose_bone.rotation_mode = "XYZ"
    pose_bone.rotation_euler = Euler(tuple(math.radians(value) for value in degrees), "XYZ")


def pose_values(clip: str, phase: float):
    wave = math.sin(phase * math.tau)
    pulse = math.sin(phase * math.tau * 2.0)
    rotations = {
        "pelvis": (-13, 0, 0), "spine": (-10, 0, 0), "chest": (-11, 0, 0),
        "neck": (8, 0, 0), "head": (5, 0, 0),
        "upperArm.L": (-58, -6, -8), "foreArm.L": (-78, 2, 7), "hand.L": (-8, 0, -5),
        "upperArm.R": (-58, 6, 8), "foreArm.R": (-78, -2, -7), "hand.R": (-8, 0, 5),
        "upperLeg.L": (-72, 4, -4), "lowerLeg.L": (104, 0, 1), "boot.L": (-22, 0, 1),
        "upperLeg.R": (-72, -4, 4), "lowerLeg.R": (104, 0, -1), "boot.R": (-22, 0, -1),
    }
    root = Vector((0.0, 0.0, 0.78))
    if clip == "menu-idle":
        rotations["chest"] = (-9 + wave * 1.2, wave * 1.4, 0)
        rotations["head"] = (4 + pulse * 0.7, wave * 4.0, -wave * 0.7)
        root.z += wave * 0.008
    elif clip == "ride":
        rotations["chest"] = (-12 + wave * 1.6, 0, wave * 1.0)
        rotations["head"] = (5 - wave * 0.8, wave * 1.2, 0)
        root.z += pulse * 0.012
    elif clip == "hard-turn":
        lean = 13 + wave * 2
        for key in ("pelvis", "spine", "chest"):
            x, y, z = rotations[key]
            rotations[key] = (x, y - 3, z + lean)
        rotations["head"] = (4, 8, -6)
        root.x -= 0.035
    elif clip == "drift":
        rotations["pelvis"] = (-17, -4, -18)
        rotations["spine"] = (-8, 7, -13)
        rotations["chest"] = (-8, 9, -11)
        rotations["head"] = (4, 11, 8)
        rotations["upperLeg.L"] = (-78, 7, -10)
        rotations["upperLeg.R"] = (-67, -3, 9)
        root.x -= 0.06
    elif clip == "boost":
        rotations["pelvis"] = (-19, 0, 0)
        rotations["spine"] = (-16, 0, 0)
        rotations["chest"] = (-19, 0, 0)
        rotations["neck"] = (13, 0, 0)
        rotations["upperArm.L"] = (-63, -4, -7)
        rotations["upperArm.R"] = (-63, 4, 7)
        root.y -= 0.035
        root.z += pulse * 0.009
    elif clip == "landing":
        compression = max(0.0, math.sin(phase * math.pi))
        rotations["pelvis"] = (-18 - compression * 8, 0, 0)
        rotations["spine"] = (-14 - compression * 5, 0, 0)
        rotations["upperLeg.L"] = (-75 - compression * 12, 4, -4)
        rotations["upperLeg.R"] = (-75 - compression * 12, -4, 4)
        rotations["lowerLeg.L"] = (106 + compression * 16, 0, 1)
        rotations["lowerLeg.R"] = (106 + compression * 16, 0, -1)
        root.z -= compression * 0.085
    elif clip == "victory":
        rotations["chest"] = (-3, 0, -4 + wave * 2)
        rotations["head"] = (-2, -6, 2)
        rotations["upperArm.R"] = (-148, 8, 16)
        rotations["foreArm.R"] = (-28, 0, -8)
        rotations["hand.R"] = (0, 0, 10 + wave * 8)
    return root, rotations


def create_actions(armature):
    armature.animation_data_create()
    durations = {"menu-idle": 72, "ride": 36, "hard-turn": 32, "drift": 40, "boost": 30, "landing": 34, "victory": 64}
    actions = []
    for clip in CLIPS:
        action = bpy.data.actions.new(clip)
        action.use_fake_user = True
        armature.animation_data.action = action
        frames = (0, durations[clip] // 2, durations[clip])
        for frame in frames:
            phase = frame / durations[clip]
            root_location, rotations = pose_values(clip, phase)
            for bone in armature.pose.bones:
                bone.rotation_mode = "XYZ"
                bone.rotation_euler = Euler((0, 0, 0), "XYZ")
                bone.location = Vector((0, 0, 0))
            armature.pose.bones["root"].location = root_location
            for bone_name, degrees in rotations.items():
                set_bone_rotation(armature.pose.bones[bone_name], degrees)
            for bone in armature.pose.bones:
                bone.keyframe_insert("rotation_euler", frame=frame, group=bone.name)
                if bone.name == "root":
                    bone.keyframe_insert("location", frame=frame, group=bone.name)
        action.frame_range = (0, durations[clip])
        actions.append(action)
    armature.animation_data.action = bpy.data.actions["ride"]
    return actions


def solve_ik_base_pose(armature):
    """Solve a mounted pose while preserving the authored limb-chain lengths."""
    targets = []

    def target(name, location):
        obj = bpy.data.objects.new(name, None)
        bpy.context.scene.collection.objects.link(obj)
        obj.location = location
        targets.append(obj)
        return obj

    for side, suffix in ((1, "L"), (-1, "R")):
        hand = target(f"Rhea_IK_Hand_{suffix}", (side * 0.33, -0.34, 1.10))
        elbow = target(f"Rhea_IK_Elbow_{suffix}", (side * 0.72, -0.18, 1.18))
        constraint = armature.pose.bones[f"foreArm.{suffix}"].constraints.new("IK")
        constraint.target = hand
        constraint.pole_target = elbow
        constraint.chain_count = 2
        constraint.pole_angle = 0.0
        foot = target(f"Rhea_IK_Foot_{suffix}", (side * 0.20, -0.42, 0.44))
        knee = target(f"Rhea_IK_Knee_{suffix}", (side * 0.20, -0.96, 0.66))
        constraint = armature.pose.bones[f"lowerLeg.{suffix}"].constraints.new("IK")
        constraint.target = foot
        constraint.pole_target = knee
        constraint.chain_count = 2
        constraint.pole_angle = 0.0

    for name, degrees in {
        "pelvis": (8, 0, 0), "spine": (9, 0, 0), "chest": (11, 0, 0),
        "neck": (-7, 0, 0), "head": (-4, 0, 0),
        "boot.L": (-12, 0, 0), "boot.R": (-12, 0, 0),
    }.items():
        set_bone_rotation(armature.pose.bones[name], degrees)
    armature.pose.bones["pelvis"].location.z = -0.14
    bpy.context.view_layer.update()
    solved = {bone.name: bone.matrix.copy() for bone in armature.pose.bones}
    for bone in armature.pose.bones:
        for constraint in list(bone.constraints):
            bone.constraints.remove(constraint)
    for obj in targets:
        bpy.data.objects.remove(obj, do_unlink=True)
    for name in BONES:
        armature.pose.bones[name].matrix = solved[name]
    bpy.context.view_layer.update()
    return {name: armature.pose.bones[name].matrix_basis.copy() for name in BONES}


def create_studio_actions(armature):
    base = solve_ik_base_pose(armature)
    armature.animation_data_create()
    durations = {"menu-idle": 72, "ride": 36, "hard-turn": 32, "drift": 40, "boost": 30, "landing": 34, "victory": 64}
    actions = []

    def rotate_local(name, axis, degrees):
        bone = armature.pose.bones[name]
        bone.rotation_quaternion = bone.rotation_quaternion @ Quaternion(axis, math.radians(degrees))

    for clip in CLIPS:
        action = bpy.data.actions.new(clip)
        action.use_fake_user = True
        armature.animation_data.action = action
        duration = durations[clip]
        for frame in (0, duration // 2, duration):
            phase = frame / duration
            wave = math.sin(phase * math.tau)
            pulse = math.sin(phase * math.tau * 2.0)
            for name in BONES:
                bone = armature.pose.bones[name]
                bone.rotation_mode = "QUATERNION"
                bone.matrix_basis = base[name].copy()
            root = armature.pose.bones["root"]
            root.location.z += pulse * (0.005 if clip in ("menu-idle", "ride") else 0.002)
            if clip == "menu-idle":
                rotate_local("chest", (0, 0, 1), wave * 1.2)
                rotate_local("head", (0, 1, 0), wave * 2.4)
            elif clip == "ride":
                rotate_local("chest", (1, 0, 0), wave * 0.8)
                rotate_local("head", (0, 1, 0), wave * 1.0)
            elif clip == "hard-turn":
                rotate_local("pelvis", (0, 0, 1), 7.0 + wave)
                rotate_local("spine", (0, 0, 1), 5.0 + wave)
                rotate_local("chest", (0, 0, 1), 6.0 + wave)
                rotate_local("head", (0, 1, 0), -5.0)
            elif clip == "drift":
                rotate_local("pelvis", (0, 0, 1), -9.0)
                rotate_local("spine", (0, 0, 1), -7.0)
                rotate_local("chest", (0, 1, 0), 5.0)
                root.location.x -= 0.025
            elif clip == "boost":
                rotate_local("spine", (1, 0, 0), -4.0)
                rotate_local("chest", (1, 0, 0), -5.5)
                rotate_local("neck", (1, 0, 0), 3.0)
                root.location.y -= 0.012
            elif clip == "landing":
                compression = max(0.0, math.sin(phase * math.pi))
                root.location.z -= compression * 0.06
                rotate_local("pelvis", (1, 0, 0), -compression * 4.0)
                rotate_local("chest", (1, 0, 0), -compression * 3.0)
            elif clip == "victory":
                rotate_local("chest", (0, 0, 1), wave * 2.0)
                rotate_local("upperArm.R", (0, 0, 1), -28.0)
                rotate_local("foreArm.R", (1, 0, 0), 32.0 + wave * 4.0)
            for bone in armature.pose.bones:
                bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
                bone.keyframe_insert("location", frame=frame, group=bone.name)
        action.frame_range = (0, duration)
        actions.append(action)
    armature.animation_data.action = bpy.data.actions["ride"]
    return actions


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def render_preview(armature, output: Path) -> None:
    scene = bpy.context.scene
    scene.frame_set(18)
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(output)
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Rhea Validation World")
    scene.world.color = (0.075, 0.105, 0.14)
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.075, 0.105, 0.14, 1.0)
    background.inputs["Strength"].default_value = 0.32
    preview_hull = principled("Validation Craft Paint", (0.035, 0.13, 0.18), 0.22, 0.35, coat=0.75)
    preview_grip = principled("Validation Craft Rubber", (0.025, 0.032, 0.04), 0.62)
    bevel_box("Validation_Seat", (0, 0.04, 0.58), (0.58, 0.72, 0.18), preview_grip, 0.045)
    bevel_box("Validation_Console", (0, 0.31, 0.77), (0.62, 0.30, 0.46), preview_hull, 0.065, (math.radians(-10), 0, 0))
    bevel_box("Validation_Handlebar", (0, 0.36, 1.095), (0.74, 0.05, 0.05), preview_grip, 0.016)
    bevel_box("Validation_Deck", (0, 0.10, 0.36), (1.15, 1.25, 0.12), preview_hull, 0.045)
    floor_mat = principled("Validation Floor", (0.055, 0.07, 0.085), 0.72)
    bevel_box("Validation_Floor", (0, 0, 0.245), (8.0, 8.0, 0.08), floor_mat, 0.02)
    bpy.ops.object.camera_add(location=(4.45, 2.45, 2.45))
    camera = bpy.context.object
    camera.name = "Rhea_Validation_Camera"
    camera.data.lens = 62
    look_at(camera, (0, 0, 1.62))
    scene.camera = camera
    bpy.ops.object.light_add(type="AREA", location=(2.8, 2.0, 4.4))
    key = bpy.context.object
    key.data.energy = 1100
    key.data.shape = "DISK"
    key.data.size = 3.2
    look_at(key, (0, 0, 1.4))
    bpy.ops.object.light_add(type="AREA", location=(-2.6, 1.2, 2.7))
    fill = bpy.context.object
    fill.data.energy = 700
    fill.data.color = (0.28, 0.62, 1.0)
    fill.data.size = 2.4
    look_at(fill, (0, 0, 1.35))
    bpy.ops.object.light_add(type="AREA", location=(0, -2.2, 3.4))
    rim = bpy.context.object
    rim.data.energy = 900
    rim.data.color = (0.25, 0.9, 0.78)
    rim.data.size = 1.8
    look_at(rim, (0, 0, 1.5))
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    output = Path(args.output).resolve()
    working = Path(args.working).resolve()
    preview = Path(args.preview).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    working.parent.mkdir(parents=True, exist_ok=True)

    body = bpy.data.objects.get("GEO-body_female_realistic")
    if not body or body.type != "MESH":
        raise RuntimeError("Expected Blender Studio source object 'GEO-body_female_realistic'")
    eye_objects = [
        bpy.data.objects["GEO-body_female_realistic.eye.L"],
        bpy.data.objects["GEO-body_female_realistic.eye.R"],
    ]
    body.name = "Rhea_CC0_Anatomical_Base"
    body.data.name = "Rhea_CC0_Anatomical_Mesh"
    body.hide_render = False
    body.hide_viewport = False
    body.hide_set(False)
    body["source_asset"] = "Blender Studio Human Base Meshes Bundle v1.0.0 / Body Female - Realistic"
    body["source_url"] = "https://download.blender.org/demo/bundles/bundles-3.6/human-base-meshes-bundle-v1.0.0.zip"
    body["source_license"] = "CC0 1.0 Universal"
    _skin, suit = configure_studio_body_materials(body)
    eye_material = principled("Rhea_Eyes_CC0_Studio", (0.055, 0.09, 0.105), 0.13, 0.0, coat=0.78)
    vest = principled("Rhea_Coastguard_Vest", (0.79, 0.13, 0.075), 0.36, 0.02, coat=0.16)
    accent = principled("Rhea_Teal_Armor", (0.02, 0.39, 0.40), 0.21, 0.18, coat=0.68)
    rubber = principled("Rhea_Grip_Rubber", (0.027, 0.037, 0.048), 0.62, 0.04, coat=0.12)
    visor = principled("Rhea_Smoked_Visor", (0.012, 0.045, 0.055), 0.12, 0.12, alpha=0.82, coat=0.55)
    reflective = principled("Rhea_Reflective_Tape", (0.72, 0.95, 0.92), 0.18, 0.08, coat=0.72, emission=(0.08, 0.28, 0.25, 0.18))
    armature = create_armature()
    skin_studio_body(body, armature)
    for index, eye in enumerate(eye_objects):
        eye.name = f"Rhea_Eye_{'L' if index == 0 else 'R'}"
        eye.data.materials.clear()
        eye.data.materials.append(eye_material)
        parent_to_bone(eye, armature, "head")
    gear = add_wet_gear(body, armature, (suit, vest, accent, rubber, visor, reflective))
    actions = create_studio_actions(armature)
    armature.rotation_euler.z = math.pi
    armature["required_bones"] = json.dumps(BONES)
    armature["required_clips"] = json.dumps(CLIPS)
    armature["gear_piece_count"] = len(gear)

    # Save an editable derivative before adding validation-only camera and lights.
    bpy.ops.wm.save_as_mainfile(filepath=str(working), compress=True)

    # Export only production objects. Blender's glTF exporter discovers all actions.
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    body.select_set(True)
    for eye in eye_objects:
        eye.select_set(True)
    for obj in gear:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_skins=True,
        export_morph=False,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_yup=True,
    )
    render_preview(armature, preview)
    print("CODEX_BUILD=" + json.dumps({
        "output": str(output),
        "working": str(working),
        "preview": str(preview),
        "bones": len(BONES),
        "actions": [action.name for action in actions],
        "gearPieces": len(gear),
        "eyeMeshes": len(eye_objects),
        "bodyVertices": len(body.data.vertices),
        "bodyFaces": len(body.data.polygons),
    }))


if __name__ == "__main__":
    main()
