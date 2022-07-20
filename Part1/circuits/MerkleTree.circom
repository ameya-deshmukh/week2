pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/mux1.circom";

template CheckRoot(n) { // compute the root of a MerkleTree of n Levels 
    signal input leaves[2**n];
    signal output root;

   //[assignment] insert your code here to calculate the Merkle root from 2^n leaves
          var total_leaves=2**n;
          component hash[total_leaves-1];
       

//hashing first level of tree

          for(var i=0;i<(total_leaves/2);i++){
            hash[i]=Poseidon(2);
            hash[i].inputs[0]<==leaves[i*2];
            hash[i].inputs[1]<==leaves[i*2+1];

          } 
          //finished hashing first level of tree 
      
      //now recursively hash each level from this

      var j=0;

      for(var i=(total_leaves/2);i<(total_leaves-1);i++){
        hash[i]=Poseidon(2);
        hash[i].inputs[0]<==hash[2*j].out;
        hash[i].inputs[1]<==hash[2*j].out;
        j++;

      }

         root<==hash[total_leaves-2].out;
            
            }


template MerkleTreeInclusionProof(n) {
    signal input leaf;
    signal input path_elements[n];
    signal input path_index[n]; // path index are 0's and 1's indicating whether the current element is on the left or right
    signal output root; // note that this is an OUTPUT signal

    //[assignment] insert your code here to compute the root from a leaf and elements along the path
   
   component hash[n];
   component mux0[n];
   component mux1[n];
   
    
   mux0[0]=Mux1();
   mux1[0]=Mux1();
   hash[0]=Poseidon(2);

   mux0[0].c[0] <== leaf;
   mux0[0].c[1] <== path_elements[0];
   mux1[0].c[0] <== path_elements[0];
   mux1[0].c[1] <== leaf;

   mux0[0].s<==path_index[0];
   mux1[0].s<==path_index[0];

   hash[0].inputs[0]<==mux0[0].out;
   hash[0].inputs[1]<==mux1[0].out;
   
    for(var i=1; i<n; i++){
        hash[i]=Poseidon(2);
       mux0[i]=Mux1();
       mux1[i]=Mux1();

       mux0[i].c[0]<==hash[i-1].out;
       mux0[i].c[1]<==path_elements[i];
       mux1[i].c[0]<==path_elements[i];
       mux1[i].c[1]<==hash[i-1].out;
       
       mux0[i].s<==path_index[i];
       mux1[i].s<==path_index[i];

       hash[i].inputs[0]<==mux0[i].out;
       hash[i].inputs[1]<==mux1[i].out;
    }

 root<==hash[n-1].out;


}