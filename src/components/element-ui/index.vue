<template>
  <div id="element-ui">
    <el-button type='primary' @click="visible = true">Button</el-button>
    <el-dialog :visible.sync="visible" title="Hello world">
      <p>Try Element</p>
    </el-dialog>
  </div>
</template>

<script src="./index.js"></script>