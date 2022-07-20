//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import { PoseidonT3 } from "./Poseidon.sol"; //an existing library to perform Poseidon hash on solidity
import "./verifier.sol"; //inherits with the MerkleTreeInclusionProof verifier contract

contract MerkleTree is Verifier {
    uint256[] public hashes; // the Merkle tree in flattened array form
    uint256 public index = 0; // the current index of the first unfilled leaf
    uint256 public root; // the current Merkle root


    constructor() {
        // [assignment] initialize a Merkle tree of 8 with blank leaves
        hashes=new uint256[](15);
        for (uint256 i=0;i<8;i++){
            hashes[i]=0;
        }
    uint256 h1= PoseidonT3.poseidon([hashes[0], hashes[1]]);
        for(uint256 i=8;i<12;i++){
            hashes[i]=h1;
        }

    uint256 h2=PoseidonT3.poseidon([hashes[8], hashes[12]]);
    for(uint i=12;i<14;i++){
        hashes[i]=h2;
    }
    hashes[14] = PoseidonT3.poseidon([hashes[12], hashes[13]]);
 
   root=hashes[14];


    }

    function insertLeaf(uint256 hashedLeaf) public returns (uint256) {
        // [assignment] insert a hashed leaf into the Merkle tree
       
       hashes[index]=hashedLeaf;
      
      uint256 insert=index;
      uint256 h;
      uint256 parent;
       for(uint256 i=0;i<3;i++){
         
            if(insert%2==0){
            h = PoseidonT3.poseidon([hashes[insert], hashes[insert+1]]);
             parent = insert/2 + 8;
            }

            else{
             h=PoseidonT3.poseidon([hashes[insert-1], hashes[insert]]);
             parent = (insert-1)/2 + 8;
            }  
         hashes[parent]=h;
         insert=parent;
       }

       index++;

       root=hashes[hashes.length-1];
       return root;
    }

    function verify(
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c,
            uint[1] memory input
        ) public view returns (bool) {

        // [assignment] verify an inclusion proof and check that the proof root matches current root
          
        return (Verifier.verifyProof(a,b,c,input)&&hashes[14]==root);
    }
        

    
}
