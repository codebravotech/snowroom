import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import axios from 'axios';
import UnityControls from '../../components/UnityControls/UnityControls';
import * as shopActions from '../../state/routes/shop';
import * as checkoutActions from '../../state/routes/checkout';
import * as unityActions from '../../state/modules/unity';
import { goToCheckout } from '../index';
import { loadModel, loadTexture, sendMessage } from '../../utils/unityUtils';
import './Shop.css';

const mapStateToProps = (state) => ({
  shop: state.routes.shop,
  checkout: state.routes.checkout,
  unity: state.unity
});

const mapDispatchToProps = {
  goToCheckout: goToCheckout,
  setShopState: shopActions.setShopState,
  addDesignToCart: checkoutActions.addDesignToCart,
  setUnityControlMode: unityActions.setUnityControlMode,
  unityEnableCamera: unityActions.unityEnableCamera,
  unityDisableCamera: unityActions.unityDisableCamera,
  toggleUnityViewAngle: unityActions.toggleUnityViewAngle
};

class _Shop extends Component {
  static propTypes = {
    shop: PropTypes.object.isRequired,
    checkout: PropTypes.object.isRequired,
    unity: PropTypes.object.isRequired,
    setShopState: PropTypes.func.isRequired,
    addDesignToCart: PropTypes.func.isRequired,
    goToCheckout: PropTypes.func.isRequired,
    setUnityControlMode: PropTypes.func.isRequired,
    unityEnableCamera: PropTypes.func.isRequired,
    unityDisableCamera: PropTypes.func.isRequired,
    toggleUnityViewAngle: PropTypes.func.isRequired
  };

  showDesign = (design) => {
    const {
      unity: {
        master
      },
      setShopState
    } = this.props;
    const {
      index
    } = design;

    const fileName = `Design${index}`;
    axios.get(`./designs/${fileName}.png`, {responseType: 'arraybuffer'})
      .then((response) => {
        const imageUint8Array = new Uint8Array(response.data);
        setShopState('displayedDesign', design);
        loadTexture(master, imageUint8Array, 'snowboard')
      });
  };

  componentDidMount(){
    window.ReceiveThumbnail = this.receiveThumbnail;
    const {
      unity: {
        master,
        unityViewAngle
      },
      shop: {
        designs,
        displayedDesign
      },
      unityEnableCamera
    } = this.props;

    const promises = [];

    unityEnableCamera(master);

    promises.push(axios.get('./objs/Snowboard.obj'));
    promises.push(axios.get('./objs/Snowboard.mtl'));

    Promise.all(promises).then(results => {
        const objText = results[0].data;
        const mtlText = results[1].data;
        const encoder = new TextEncoder();
        const objUnti8Array = encoder.encode(objText);
        const mtlUnti8Array = encoder.encode(mtlText);

        loadModel(master, objUnti8Array, 'snowboard', 'OBJ', mtlUnti8Array).then(() => {
          const shadowJSON = {
            enabled: true,
            distance: .1
          };
          sendMessage(master, 'SetShadows', shadowJSON);

          displayedDesign ? this.showDesign(displayedDesign) : this.showDesign(designs[0]);
        });
    });
  }

  componentWillUnmount(){
    const {
      unity: {
        master
      },
      unityDisableCamera
    } = this.props;

    unityDisableCamera(master);
  }

  addToCart = () => {
    const {
      unity: {
        master
      }
    } = this.props;

    sendMessage(master, 'genThumbnail');
  };

  unityHeapDataToBase64 = (pointer, length) => {
    const {
      unity
    } = this.props;

    const warpedArtFileArray = new Uint8Array(unity.master.Module.HEAPU8.buffer, pointer, length);
    const len = warpedArtFileArray.byteLength;
    let binary = '';

    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(warpedArtFileArray[i]);
    }

    return btoa(binary);
  };

  receiveThumbnail = (pointer, length) => {
    const {
      shop: {
        displayedDesign,
      },
      unity: {
        master
      },
      addDesignToCart,
      setShopState
    } = this.props;
    const snapshot = this.unityHeapDataToBase64(pointer, length);
    sendMessage(master, 'SnapshotCancel');

    displayedDesign.snapshotBase64 = `data:image/png;base64,${snapshot}`;
    addDesignToCart(displayedDesign);
    setShopState('addedToCart', true);
    setTimeout(() => {setShopState('addedToCart', false)}, 2000);
  };

  renderDesignChangeControls = () => {
    const {
      shop: {
        designs,
        displayedDesign
      }
    } = this.props;

    const designCount = designs.length;
    const index = displayedDesign ? displayedDesign.index : 0;

    return(
      <div id='design-change-controls-container'>
        <button
          className='design-change-arrow'
          onClick = {() => {
            const newIndex = index === 0 ? designCount - 1 : index - 1;
            this.showDesign(designs[newIndex]);
        }}>
          <img className='arrow-image' src="./images/left-arrow.png" alt='Left'/>
        </button>
        {
          designs.map((design) =>
            <span
              key={`Design${design.index}`}
              id={index === design.index ? 'dot-active' : null}
              className='dot'
              onClick= { () =>
                this.showDesign(design)}/>)
        }
        <button
          className='design-change-arrow'
          onClick = {() => {
            const newIndex = (index + 1) % designCount;
            this.showDesign(designs[newIndex])
        }}>
          <img className='arrow-image' src="./images/right-arrow.png" alt='Right'/>
        </button>
      </div>
    );
  };

  renderDesignDetails = () => {
    if(!this.props.shop.displayedDesign) return null;
    const {
      shop: {
        displayedDesign: {
          name,
          description,
          price
        }
      }
    } = this.props;

    return(
      <div id='design-info'>
        <h3>{name}</h3>
        <div>{description}</div>
        <div>Online: ${price}</div>
        <button onClick={this.addToCart}>Add to Cart</button>
      </div>
    )
  };

  renderCartButton(){
    const{
      checkout:{
        cart,
      },
      goToCheckout
    } = this.props;

    if(Object.keys(cart).length < 1) return;
    return (
      <button id='go-to-checkout' onClick={goToCheckout}>Checkout</button>
    )
  }

  renderAddedToCart(){
    const{
      shop:{
        addedToCart,
      }
    } = this.props;

    if(!addedToCart) return;
    return <div id='added-to-cart'>ADDED TO CART</div>
  }

  render(){
    const {
      unity,
      setUnityControlMode,
      toggleUnityViewAngle
    } = this.props;

    return (
      <div id='shop-screen'>
        <div id='shop-header-container'>
          <img id='shop-header'   src='./images/title.svg'/>
        </div>
        <UnityControls
          unity={unity}
          setUnityControlMode={setUnityControlMode}
          toggleUnityViewAngle={toggleUnityViewAngle}
        />
        {this.renderDesignChangeControls()}
        {this.renderDesignDetails()}
        {this.renderCartButton()}
        {this.renderAddedToCart()}
      </div>
    )
  }
}


const Shop = connect(mapStateToProps, mapDispatchToProps)(_Shop);
export default Shop;