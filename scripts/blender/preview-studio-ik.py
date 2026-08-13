"""Validate a chain-length-preserving IK riding pose on the CC0 male."""

from pathlib import Path
import runpy

import bpy
from mathutils import Vector


module = runpy.run_path("scripts/blender/build-authored-rhea.py", run_name="rhea_studio_ik_test")
body = next(obj for obj in bpy.data.objects if obj.name.startswith("GEO-body_") and obj.type == "MESH" and ".eye." not in obj.name)
for modifier in list(body.modifiers):
    if modifier.type == "MULTIRES":
        body.modifiers.remove(modifier)
skin = module["principled"]("Studio Male Validation Skin", (0.34, 0.16, 0.09), 0.48)
body.data.materials.append(skin)
armature = module["create_armature"]()
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
armature.select_set(True)
bpy.context.view_layer.objects.active = armature
bpy.ops.object.parent_set(type="ARMATURE_AUTO", keep_transform=True)
for eye in (bpy.data.objects[f"{body.name}.eye.L"], bpy.data.objects[f"{body.name}.eye.R"]):
    module["parent_to_bone"](eye, armature, "head")


def empty(name, location):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.empty_display_size = 0.06
    return obj


targets = []
for side, suffix in ((1, "L"), (-1, "R")):
    hand_target = empty(f"IK_Hand_{suffix}", (side * 0.33, -0.34, 1.10))
    elbow_pole = empty(f"IK_ElbowPole_{suffix}", (side * 0.72, -0.18, 1.18))
    arm_ik = armature.pose.bones[f"foreArm.{suffix}"].constraints.new("IK")
    arm_ik.target = hand_target
    arm_ik.pole_target = elbow_pole
    arm_ik.chain_count = 2
    arm_ik.pole_angle = 0.0
    foot_target = empty(f"IK_Foot_{suffix}", (side * 0.20, -0.42, 0.44))
    knee_pole = empty(f"IK_KneePole_{suffix}", (side * 0.20, -0.96, 0.66))
    leg_ik = armature.pose.bones[f"lowerLeg.{suffix}"].constraints.new("IK")
    leg_ik.target = foot_target
    leg_ik.pole_target = knee_pole
    leg_ik.chain_count = 2
    leg_ik.pole_angle = 0.0
    targets.extend((hand_target, elbow_pole, foot_target, knee_pole))

for name, degrees in {
    "pelvis": (-7, 0, 0),
    "spine": (-8, 0, 0),
    "chest": (-10, 0, 0),
    "neck": (7, 0, 0),
    "head": (4, 0, 0),
    "boot.L": (-12, 0, 0),
    "boot.R": (-12, 0, 0),
}.items():
    module["set_bone_rotation"](armature.pose.bones[name], degrees)
armature.pose.bones["pelvis"].location.z = -0.14
bpy.context.view_layer.update()

solved = {bone.name: bone.matrix.copy() for bone in armature.pose.bones}
for bone in armature.pose.bones:
    for constraint in list(bone.constraints):
        bone.constraints.remove(constraint)
for obj in targets:
    bpy.data.objects.remove(obj, do_unlink=True)
for name in module["BONES"]:
    armature.pose.bones[name].matrix = solved[name]
armature.rotation_euler.z = 3.141592653589793

output = Path("art-source/characters/blender-studio-human-base-male/ik-rig-preview.png").resolve()
module["render_preview"](armature, output)
print(f"CODEX_STUDIO_IK_PREVIEW={output}")
