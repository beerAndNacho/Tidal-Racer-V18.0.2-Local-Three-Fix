"""Validate auto weights and mounted pose on Blender Studio's CC0 male."""

from pathlib import Path
import runpy

import bpy
from mathutils import Matrix, Vector


module = runpy.run_path("scripts/blender/build-authored-rhea.py", run_name="rhea_studio_test")
body = bpy.data.objects["GEO-body_male_realistic"]
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
for eye in (bpy.data.objects["GEO-body_male_realistic.eye.L"], bpy.data.objects["GEO-body_male_realistic.eye.R"]):
    module["parent_to_bone"](eye, armature, "head")
armature.rotation_euler.z = 3.141592653589793

targets = {
    "root": ((0, 0, 0), (0, 0, 0.16)),
    "pelvis": ((0, 0, 0.78), (0, -0.06, 0.95)),
    "spine": ((0, -0.06, 0.95), (0, -0.12, 1.12)),
    "chest": ((0, -0.12, 1.12), (0, -0.23, 1.34)),
    "neck": ((0, -0.23, 1.34), (0, -0.26, 1.46)),
    "head": ((0, -0.26, 1.46), (0, -0.29, 1.67)),
    "upperArm.L": ((0.21, -0.18, 1.33), (0.37, -0.46, 1.17)),
    "foreArm.L": ((0.37, -0.46, 1.17), (0.34, -0.80, 1.04)),
    "hand.L": ((0.34, -0.80, 1.04), (0.31, -0.91, 1.02)),
    "upperArm.R": ((-0.21, -0.18, 1.33), (-0.37, -0.46, 1.17)),
    "foreArm.R": ((-0.37, -0.46, 1.17), (-0.34, -0.80, 1.04)),
    "hand.R": ((-0.34, -0.80, 1.04), (-0.31, -0.91, 1.02)),
    "upperLeg.L": ((0.14, -0.01, 0.82), (0.20, -0.55, 0.61)),
    "lowerLeg.L": ((0.20, -0.55, 0.61), (0.22, -0.90, 0.32)),
    "boot.L": ((0.22, -0.90, 0.32), (0.22, -1.04, 0.25)),
    "upperLeg.R": ((-0.14, -0.01, 0.82), (-0.20, -0.55, 0.61)),
    "lowerLeg.R": ((-0.20, -0.55, 0.61), (-0.22, -0.90, 0.32)),
    "boot.R": ((-0.22, -0.90, 0.32), (-0.22, -1.04, 0.25)),
}
for name, (head, tail) in targets.items():
    direction = Vector(tail) - Vector(head)
    rotation = direction.to_track_quat("Y", "Z").to_matrix().to_4x4()
    armature.pose.bones[name].matrix = Matrix.Translation(Vector(head)) @ rotation

output = Path("art-source/characters/blender-studio-human-base-male/auto-rig-preview.png").resolve()
module["render_preview"](armature, output)
print(f"CODEX_STUDIO_RIG_PREVIEW={output}")
