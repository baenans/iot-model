To compile the protobuffs, cd into the directory and 

### nanopb

- download protoc-gen-nanopb [here](https://github.com/nanopb/nanopb)
- cd ...../rgbledstatus
- protoc --plugin=protoc-gen-nanopb=/Users/franbaena/dev/protobufs/nanopb/generator/protoc-gen-nanopb --nanopb_out=. rgbledstatus.proto

### python

- cd ....../rgbledstatus
- protoc -I=/Users/franbaena/dev/iot-model/protobuff/rgbledstatus --python_out=. rgbledstatus.prot