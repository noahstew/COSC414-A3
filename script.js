var VSHADER_SOURCE =
    'attribute vec3 position;' +
    'uniform mat4 Pmatrix;'+ // projection matrix
    'uniform mat4 Vmatrix;'+ // view matrix
    'uniform mat4 Mmatrix;'+ // model matrix
    'attribute vec3 color;'+ // the color of the vertex
    'varying vec3 vColor;'+
  'void main() {\n' +
    'gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.0);\n' +
    'vColor = color;'+
    'gl_PointSize = 1.0;'+
  '}\n';
  
// Fragment shader program
var FSHADER_SOURCE =
    'precision mediump float;'+
    'varying vec3 vColor;'+
  'void main() {\n' +
  '  gl_FragColor = vec4(vColor, 1.0);\n' +
  '}\n';

var dragging = false;         // Dragging or not
var lastX = 0, lastY = 0;     // Last position of the mouse
var dX = 0, dY = 0;           // Difference in position
var currentAngle = [0, 0];    // Current rotation angle ([x-axis, y-axis] degrees)


  function main() {
    // Retrieve <canvas> element
    var canvas = document.getElementById('webgl');
  
    // Get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
      console.log('Failed to get the rendering context for WebGL');
      return;
    }
  
    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
      console.log('Failed to intialize shaders.');
      return;
    }
  
    // Set the vertex information
    var n = initVertexBuffers(gl);
    if (n < 0) {
      console.log('Failed to set the vertex information');
      return;
    }
  
    // Create projection, view, and model matrices
    var projMatrix = new Matrix4();
    var viewMatrix = new Matrix4();
    var modelMatrix = new Matrix4();
  
    // Specify the viewing volume and view matrix
    projMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);
    viewMatrix.setLookAt(0, 0, 5, 0, 0, -0, 0, 1, 0);
  
    // Get the location of the matrix uniforms
    var u_ProjMatrix = gl.getUniformLocation(gl.program, 'Pmatrix');
    var u_ViewMatrix = gl.getUniformLocation(gl.program, 'Vmatrix');
    var u_ModelMatrix = gl.getUniformLocation(gl.program, 'Mmatrix');
  
    canvas.onmousedown = function(ev) {   // Mouse is pressed
      var x = ev.clientX, y = ev.clientY;
      // Start dragging if a mouse is in <canvas>
      var rect = ev.target.getBoundingClientRect();
      if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
        lastX = x; lastY = y;
        dragging = true;
      }
    };
    
    canvas.onmouseup = function(ev) { dragging = false;  }; // Mouse is released
    
    canvas.onmousemove = function(ev) { // Mouse is moved
      var x = ev.clientX, y = ev.clientY;
      if (dragging) {
        var factor = 100/canvas.height; // The rotation ratio
        dX = factor * (x - lastX);
        dY = factor * (y - lastY);
        // Limit x-axis rotation angle to -90 to 90 degrees
        currentAngle[0] = Math.max(Math.min(currentAngle[0] + dY, 90.0), -90.0);
        currentAngle[1] = currentAngle[1] + dX;
      }
      lastX = x, lastY = y;
    };
    

    // Set the clear color and enable the depth test
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
  
    var tick = function() {
      // Update the model matrix based on the current rotation angles
      modelMatrix.setRotate(currentAngle[0], 1, 0, 0); // Rotation around x-axis
      modelMatrix.rotate(currentAngle[1], 0, 1, 0);    // Rotation around y-axis
  
      // Pass the projection, view, and model matrices to the vertex shader
      gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
      gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  
      // Clear color and depth buffer
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
      // Draw the sphere
      gl.drawElements(gl.POINTS, n, gl.UNSIGNED_SHORT, 0);
  
      // Request the browser to call tick
      requestAnimationFrame(tick, canvas);
    };
    tick();
  }
  
function initVertexBuffers(gl) {
  var radius = 1.0;
  var grey = [0.6, 0.6, 0.6];
  var white = [1.0, 1.0, 1.0];
  var sphereData = sphere(radius, 30, 30, grey); // latitudes and longitudes are both 20
  var meshData = sphere(radius, 20, 20, white);
  // Create a buffer for the vertices
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sphereData.vertices, gl.STATIC_DRAW);

  var FSIZE = sphereData.vertices.BYTES_PER_ELEMENT;

  // Get the storage location of a_Position, assign and enable buffer
  var a_Position = gl.getAttribLocation(gl.program, 'position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 6, 0);
  gl.enableVertexAttribArray(a_Position);  // Enable the assignment of the buffer object

  // Get the storage location of a_Color, assign buffer and enable
  var a_Color = gl.getAttribLocation(gl.program, 'color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
  gl.enableVertexAttribArray(a_Color);  // Enable the assignment of the buffer object

  // Create a buffer for the indices
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Write the indices to the buffer object
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphereData.indices, gl.STATIC_DRAW);

  return sphereData.indices.length;
}



function sphere(radius, latitudes, longitudes, color) {
  var vertices = [];
  for (var latNumber = 0; latNumber <= latitudes; latNumber++) {
    var theta = latNumber * Math.PI / latitudes;
    var sinTheta = Math.sin(theta);
    var cosTheta = Math.cos(theta);

    for (var longNumber = 0; longNumber <= longitudes; longNumber++) {
      var phi = longNumber * 2 * Math.PI / longitudes;
      var sinPhi = Math.sin(phi);
      var cosPhi = Math.cos(phi);

      var x = cosPhi * sinTheta;
      var y = cosTheta;
      var z = sinPhi * sinTheta;
      var r = color[0];
      var g = color[1];
      var b = color[2];

      vertices.push(radius * x);
      vertices.push(radius * y);
      vertices.push(radius * z);
      vertices.push(r);
      vertices.push(g);
      vertices.push(b);
    }
  }

  var indices = [];
  for (var latNumber = 0; latNumber < latitudes; latNumber++) {
    for (var longNumber = 0; longNumber < longitudes; longNumber++) {
      var first = (latNumber * (longitudes + 1)) + longNumber;
      var second = first + longitudes + 1;
      indices.push(first);
      indices.push(second);
      indices.push(first + 1);

      indices.push(second);
      indices.push(second + 1);
      indices.push(first + 1);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
  };
}
