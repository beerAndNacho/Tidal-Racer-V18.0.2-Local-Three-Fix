"""Preview an absolute joint-target riding pose on the authored Rhea rig."""

from pathlib import Path
import runpy

import bpy
from mathutils import Matrix, Vector


armature = bpy.data.objects["Rhea_Competition_Rig"]
armature.data.pose_position = "POSE"
if armature.animation_data:
    armature.animation_data.action = None
for bone in armature.pose.bones:
    bone.matrix_basis.identity()


targets = {
    "root": ((0, 0, 0), (0, 0, 0.16)),
    "pelvis": ((0, 0.0, 0.76), (0, -0.06, 0.92)),
    "spine": ((0, -0.06, 0.92), (0, -0.11, 1.08)),
    "chest": ((0, -0.11, 1.08), (0, -0.22, 1.28)),
    "neck": ((0, -0.22, 1.28), (0, -0.25, 1.40)),
    "head": ((0, -0.25, 1.40), (0, -0.29, 1.59)),
    "upperArm.L": ((0.21, -0.17, 1.27), (0.37, -0.43, 1.12)),
    "foreArm.L": ((0.37, -0.43, 1.12), (0.34, -0.78, 1.01)),
    "hand.L": ((0.34, -0.78, 1.01), (0.31, -0.89, 1.00)),
    "upperArm.R": ((-0.21, -0.17, 1.27), (-0.37, -0.43, 1.12)),
    "foreArm.R": ((-0.37, -0.43, 1.12), (-0.34, -0.78, 1.01)),
    "hand.R": ((-0.34, -0.78, 1.01), (-0.31, -0.89, 1.00)),
    "upperLeg.L": ((0.13, -0.01, 0.78), (0.19, -0.53, 0.59)),
    "lowerLeg.L": ((0.19, -0.53, 0.59), (0.22, -0.88, 0.32)),
    "boot.L": ((0.22, -0.88, 0.32), (0.22, -1.01, 0.25)),
    "upperLeg.R": ((-0.13, -0.01, 0.78), (-0.19, -0.53, 0.59)),
    "lowerLeg.R": ((-0.19, -0.53, 0.59), (-0.22, -0.88, 0.32)),
    "boot.R": ((-0.22, -0.88, 0.32), (-0.22, -1.01, 0.25)),
}


for name, (head, tail) in targets.items():
    direction = Vector(tail) - Vector(head)
    rotation = direction.to_track_quat("Y", "Z").to_matrix().to_4x4()
    armature.pose.bones[name].matrix = Matrix.Translation(Vector(head)) @ rotation

module = runpy.run_path("scripts/blender/build-authored-rhea.py", run_name="rhea_preview_module")
output = Path("art-source/characters/texture-wizard-male-base/rhea-target-pose-preview.png").resolve()
module["render_preview"](armature, output)
print(f"CODEX_TARGET_PREVIEW={output}")
